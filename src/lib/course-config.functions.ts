import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePerm } from "./access";
import type { Database, Json } from "@/integrations/supabase/types";

export type CourseConfig = {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  courseDescription: string;
  cohortId: string;
  cohortName: string;
  headline: string;
  offerLabel: string;
  startDate: string;
  endDate: string;
  whatsappLink: string;
  earlyBirdEnabled: boolean;
  earlyBirdPrice: number;
  earlyBirdDeadline: string | null;
  outrightPrice: number;
  instalmentAmount: number;
  instalmentCount: number;
  outrightCopy: string;
  instalmentCopy: string;
  depositAmount: number;
  balanceDueDate: string | null;
  seatLimit: number | null;
  seatsTaken: number;
  freeClassTitle: string;
  freeClassAt: string | null;
  hasSyllabus: boolean;
  currencies: PublicCurrency[];
  media: PublicMedia[];
  content: Json;
};
export type PublicCurrency = { code: string; label: string; symbol: string; deposit: number; early: number; monthly: number; chargeable: boolean };
export type PublicMedia = { id: string; kind: string; title: string; subtitle: string | null; quote: string | null; video_url: string | null; image_url: string | null; sort: number };

export const FALLBACK_COURSE_CONFIG: CourseConfig = {
  courseId: "", courseTitle: "Digital Marketing Bootcamp", courseSlug: "digital-marketing",
  courseDescription: "Professional Digital Marketing Bootcamp with live classes, practical projects and industry certifications.",
  cohortId: "", cohortName: "November 2026", headline: "Become a job-ready digital marketer. Certified, with a portfolio to prove it.",
  offerLabel: "Early bird", startDate: "Saturday 14 November 2026", endDate: "", whatsappLink: "",
  earlyBirdEnabled: true, earlyBirdPrice: 60000, earlyBirdDeadline: "2026-10-31T22:59:59Z",
  outrightPrice: 90000, instalmentAmount: 40000, instalmentCount: 3,
  outrightCopy: "Pay once and secure your seat.", instalmentCopy: "Pay monthly in equal instalments.",
  depositAmount: 10000, balanceDueDate: "2026-11-07", seatLimit: 40, seatsTaken: 0,
  freeClassTitle: "Build your first marketing strategy", freeClassAt: "2026-10-17T10:00:00Z", hasSyllabus: false,
  currencies: [
    { code: "USD", label: "US dollars", symbol: "$", deposit: 10, early: 45, monthly: 30, chargeable: true },
    { code: "GBP", label: "British pounds", symbol: "£", deposit: 8, early: 35, monthly: 24, chargeable: false },
    { code: "EUR", label: "Euros", symbol: "€", deposit: 9, early: 40, monthly: 27, chargeable: false },
    { code: "CAD", label: "Canadian dollars", symbol: "CA$", deposit: 14, early: 60, monthly: 40, chargeable: false },
    { code: "GHS", label: "Ghana cedis", symbol: "GH₵", deposit: 120, early: 600, monthly: 400, chargeable: false },
    { code: "KES", label: "Kenyan shillings", symbol: "KSh ", deposit: 1300, early: 5800, monthly: 3900, chargeable: false },
    { code: "ZAR", label: "South African rand", symbol: "R", deposit: 180, early: 800, monthly: 540, chargeable: false },
  ],
  media: [
    ...["Jumia", "FirstBank", "Sterling", "Pulse", "Ubuntu", "Britam", "Mikano", "InEvent", "emPLE", "Café One"].map((t, i) => ({
      id: `logo-${i}`, kind: "logo", title: t, subtitle: null, quote: null, video_url: null, sort: i,
      image_url: `/brand/alumni/${t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}.webp`,
    })),
  ],
  content: {},
};

function mapConfig(row: any): CourseConfig {
  const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
  return {
    courseId: row.course_id, courseTitle: course?.title ?? row.course ?? FALLBACK_COURSE_CONFIG.courseTitle,
    courseSlug: course?.slug ?? FALLBACK_COURSE_CONFIG.courseSlug, courseDescription: course?.description ?? "",
    cohortId: row.id, cohortName: row.name, headline: row.headline ?? FALLBACK_COURSE_CONFIG.headline,
    offerLabel: row.offer_label ?? "Early bird", startDate: row.start_date ?? FALLBACK_COURSE_CONFIG.startDate,
    endDate: row.end_date ?? "", whatsappLink: row.whatsapp_link ?? "", earlyBirdEnabled: row.early_bird_enabled,
    earlyBirdPrice: row.early_bird_price, earlyBirdDeadline: row.early_bird_deadline,
    outrightPrice: row.outright_price, instalmentAmount: row.instalment_amount, instalmentCount: row.instalment_count,
    outrightCopy: row.outright_copy ?? "", instalmentCopy: row.instalment_copy ?? "",
    // Must match what checkout charges (pricing.server reads the same columns): no column, no deposit.
    depositAmount: Number(row.deposit_amount ?? 0),
    balanceDueDate: row.balance_due_date ?? null,
    seatLimit: row.seat_limit ?? null,
    seatsTaken: 0,
    freeClassTitle: row.free_class_title ?? FALLBACK_COURSE_CONFIG.freeClassTitle,
    freeClassAt: row.free_class_at === undefined ? FALLBACK_COURSE_CONFIG.freeClassAt : row.free_class_at,
    hasSyllabus: false,
    currencies: FALLBACK_COURSE_CONFIG.currencies,
    media: FALLBACK_COURSE_CONFIG.media,
    content: {},
  };
}

export const getPublicCourseConfig = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    const db = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
    });
    const any = db as any;
    // Each extra lookup is optional: if a table is missing or slow, the page still renders.
    const [cohort, cur, media, content] = await Promise.all([
      db.from("cohorts").select("*, courses(title,slug,description)").eq("status", "open").eq("is_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      any.from("currencies").select("code,label,symbol,deposit,early_total,monthly,chargeable").eq("active", true).order("sort").then((r: any) => r, () => ({ error: true })),
      any.from("site_media").select("id,kind,title,subtitle,quote,video_url,image_url,sort").eq("active", true).order("sort").then((r: any) => r, () => ({ error: true })),
      any.from("site_content").select("published").eq("key", "home").maybeSingle().then((r: any) => r, () => ({ error: true })),
    ]);
    const cfg = cohort.data ? mapConfig(cohort.data) : { ...FALLBACK_COURSE_CONFIG };
    if (!cur.error && cur.data) cfg.currencies = cur.data.map((c: any) => ({ code: c.code, label: c.label, symbol: c.symbol, deposit: Number(c.deposit), early: Number(c.early_total), monthly: Number(c.monthly), chargeable: !!c.chargeable }));
    if (!media.error && media.data) cfg.media = media.data;
    if (!content.error && content.data?.published) cfg.content = content.data.published;
    if (cfg.cohortId) {
      const stats = await any.rpc("public_site_stats", { _cohort: cfg.cohortId }).then((r: any) => r, () => ({ error: true }));
      if (!stats.error && stats.data) { cfg.seatsTaken = Number(stats.data.early_seats_taken ?? 0); cfg.hasSyllabus = !!stats.data.has_syllabus; }
    }
    return cfg;
  } catch { return FALLBACK_COURSE_CONFIG; }
});

async function adminRole(context: any) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("admin") && !roles.includes("super_admin")) throw new Error("Forbidden");
  return roles.includes("super_admin") ? "super_admin" : "admin";
}

export const listCourseCms = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await requirePerm(context, "cohorts", "content");
  const [{ data: courses, error: ce }, { data: cohorts, error: he }] = await Promise.all([
    context.supabase.from("courses").select("*").order("created_at"),
    context.supabase.from("cohorts").select("*").order("created_at", { ascending: false }),
  ]);
  if (ce || he) throw new Error(ce?.message ?? he?.message);
  return { courses: courses ?? [], cohorts: cohorts ?? [] };
});

export const saveCourse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(120), slug: z.string().trim().regex(/^[a-z0-9-]+$/), description: z.string().trim().max(1000), status: z.enum(["active", "inactive"]), published: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "cohorts"); const row = { title: data.title, slug: data.slug, description: data.description || null, status: data.status, is_published: data.published };
    const q = data.id ? context.supabase.from("courses").update(row).eq("id", data.id) : context.supabase.from("courses").insert(row);
    const { error } = await q; if (error) throw new Error(error.message); return { ok: true };
  });

const cohortSchema = z.object({
  id: z.string().uuid().optional(), courseId: z.string().uuid(), name: z.string().trim().min(2).max(120), startDate: z.string().trim().max(80), endDate: z.string().trim().max(80), whatsappLink: z.string().trim().max(300), status: z.enum(["open", "closed"]), published: z.boolean(), headline: z.string().trim().min(2).max(180), offerLabel: z.string().trim().min(2).max(80), earlyBirdEnabled: z.boolean(), earlyBirdPrice: z.number().int().min(0), earlyBirdDeadline: z.string().nullable(), outrightPrice: z.number().int().min(0), instalmentAmount: z.number().int().min(0), instalmentCount: z.number().int().min(1).max(12), outrightCopy: z.string().trim().max(300), instalmentCopy: z.string().trim().max(300),
  depositAmount: z.number().int().min(0).max(10_000_000).optional().default(0), balanceDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  seatLimit: z.number().int().min(1).max(100000).nullable().optional(), freeClassTitle: z.string().trim().max(160).optional().default(""), freeClassAt: z.string().nullable().optional(),
});

export const saveCohortCms = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => cohortSchema.parse(d)).handler(async ({ data, context }) => {
  await requirePerm(context, "cohorts");
  const course = await context.supabase.from("courses").select("title").eq("id", data.courseId).single();
  if (course.error) throw new Error(course.error.message);
  const row = { course_id: data.courseId, course: course.data.title, name: data.name, start_date: data.startDate || null, end_date: data.endDate || null, whatsapp_link: data.whatsappLink || null, status: data.status, is_published: data.published, headline: data.headline, offer_label: data.offerLabel, early_bird_enabled: data.earlyBirdEnabled, early_bird_price: data.earlyBirdPrice, early_bird_deadline: data.earlyBirdDeadline || null, outright_price: data.outrightPrice, instalment_amount: data.instalmentAmount, instalment_count: data.instalmentCount, outright_copy: data.outrightCopy || null, instalment_copy: data.instalmentCopy || null,
    deposit_amount: data.depositAmount, balance_due_date: data.balanceDueDate || null, seat_limit: data.seatLimit ?? null, free_class_title: data.freeClassTitle || null, free_class_at: data.freeClassAt || null };
  if (data.depositAmount > 0 && (data.depositAmount > data.earlyBirdPrice || data.depositAmount > data.instalmentAmount)) throw new Error("The deposit can't be more than the early-bird price or the monthly instalment.");
  if (data.depositAmount > 0 && !data.balanceDueDate) throw new Error("Set the date the balance is due.");
  const q = data.id ? context.supabase.from("cohorts").update(row).eq("id", data.id) : context.supabase.from("cohorts").insert(row);
  const { error } = await q; if (error) throw new Error(error.message); return { ok: true };
});

export const previewStudent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ enrolmentId: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => {
  await requirePerm(context, "preview");
  const { data: target, error } = await context.supabase.from("enrolments").select("id,email,name").eq("id", data.enrolmentId).single();
  if (error || !target) throw new Error("Student not found.");
  const { data: rows, error: rowsError } = await context.supabase.from("enrolments").select("id,kind,name,plan,instalment_month,amount,status,paid_at,created_at,tx_ref,mode").eq("email", target.email).eq("mode", "live").order("created_at");
  if (rowsError) throw new Error(rowsError.message);
  const { error: auditError } = await context.supabase.from("admin_preview_audit").insert({ admin_user_id: context.userId, enrolment_id: target.id, preview_type: "student" });
  if (auditError) throw new Error(auditError.message);
  const list = rows ?? []; const monthly = list.some((r: any) => r.kind === "enrolment" && r.plan === "monthly" && r.status === "paid");
  const paid = new Set(list.filter((r: any) => r.kind === "instalment" && r.status === "paid").map((r: any) => r.instalment_month));
  return { name: target.name, email: target.email, rows: list, nextDue: monthly ? ["December", "January"].find((m) => !paid.has(m)) ?? null : null };
});