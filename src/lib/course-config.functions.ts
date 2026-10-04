import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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
};

export const FALLBACK_COURSE_CONFIG: CourseConfig = {
  courseId: "", courseTitle: "Digital Marketing Bootcamp", courseSlug: "digital-marketing",
  courseDescription: "Professional Digital Marketing Bootcamp with live classes, practical projects and industry certifications.",
  cohortId: "", cohortName: "November 2026", headline: "Become a job-ready digital marketer. Certified, with a portfolio to prove it.",
  offerLabel: "Early bird", startDate: "Thursday 5 November 2026", endDate: "", whatsappLink: "",
  earlyBirdEnabled: true, earlyBirdPrice: 60000, earlyBirdDeadline: "2026-10-10T22:59:59Z",
  outrightPrice: 90000, instalmentAmount: 40000, instalmentCount: 3,
  outrightCopy: "Pay once and secure your seat.", instalmentCopy: "Pay monthly in equal instalments.",
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
  };
}

export const getPublicCourseConfig = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    const db = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
    });
    const { data } = await db.from("cohorts").select("*, courses(title,slug,description)").eq("status", "open").eq("is_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return data ? mapConfig(data) : FALLBACK_COURSE_CONFIG;
  } catch { return FALLBACK_COURSE_CONFIG; }
});

async function adminRole(context: any) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("admin") && !roles.includes("super_admin")) throw new Error("Forbidden");
  return roles.includes("super_admin") ? "super_admin" : "admin";
}

export const listCourseCms = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await adminRole(context);
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
    await adminRole(context); const row = { title: data.title, slug: data.slug, description: data.description || null, status: data.status, is_published: data.published };
    const q = data.id ? context.supabase.from("courses").update(row).eq("id", data.id) : context.supabase.from("courses").insert(row);
    const { error } = await q; if (error) throw new Error(error.message); return { ok: true };
  });

const cohortSchema = z.object({
  id: z.string().uuid().optional(), courseId: z.string().uuid(), name: z.string().trim().min(2).max(120), startDate: z.string().trim().max(80), endDate: z.string().trim().max(80), whatsappLink: z.string().trim().max(300), status: z.enum(["open", "closed"]), published: z.boolean(), headline: z.string().trim().min(2).max(180), offerLabel: z.string().trim().min(2).max(80), earlyBirdEnabled: z.boolean(), earlyBirdPrice: z.number().int().min(0), earlyBirdDeadline: z.string().nullable(), outrightPrice: z.number().int().min(0), instalmentAmount: z.number().int().min(0), instalmentCount: z.number().int().min(1).max(12), outrightCopy: z.string().trim().max(300), instalmentCopy: z.string().trim().max(300),
});

export const saveCohortCms = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => cohortSchema.parse(d)).handler(async ({ data, context }) => {
  await adminRole(context);
  const course = await context.supabase.from("courses").select("title").eq("id", data.courseId).single();
  if (course.error) throw new Error(course.error.message);
  const row = { course_id: data.courseId, course: course.data.title, name: data.name, start_date: data.startDate || null, end_date: data.endDate || null, whatsapp_link: data.whatsappLink || null, status: data.status, is_published: data.published, headline: data.headline, offer_label: data.offerLabel, early_bird_enabled: data.earlyBirdEnabled, early_bird_price: data.earlyBirdPrice, early_bird_deadline: data.earlyBirdDeadline || null, outright_price: data.outrightPrice, instalment_amount: data.instalmentAmount, instalment_count: data.instalmentCount, outright_copy: data.outrightCopy || null, instalment_copy: data.instalmentCopy || null };
  const q = data.id ? context.supabase.from("cohorts").update(row).eq("id", data.id) : context.supabase.from("cohorts").insert(row);
  const { error } = await q; if (error) throw new Error(error.message); return { ok: true };
});

export const previewStudent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d: unknown) => z.object({ enrolmentId: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => {
  await adminRole(context);
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