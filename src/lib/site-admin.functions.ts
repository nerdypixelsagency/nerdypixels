// Admin: site content builder, media & syllabus, currencies, admin access and automated emails.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERMS, PRESETS, AUTO_EMAILS, requirePerm, requireSuper } from "./access";
import type { Json } from "@/integrations/supabase/types";

const CONTENT_KEYS = ["home"] as const;

// ---------- Site content (draft, preview, publish) ----------
export const getSiteContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.enum(CONTENT_KEYS) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "content");
    const { data: row, error } = await context.supabase.from("site_content").select("*").eq("key", data.key).maybeSingle();
    if (error) throw new Error(error.message.includes("does not exist") ? "Run the latest database update first (site_content is missing)." : error.message);
    return (row ?? { key: data.key, draft: {}, published: {}, updated_at: null, published_at: null }) as { key: string; draft: Json; published: Json; updated_at: string | null; published_at: string | null };
  });

const contentJson = z.record(z.string(), z.any()).refine((v) => JSON.stringify(v).length < 400_000, "Content is too large.").transform((v) => v as { [k: string]: Json });

export const saveSiteDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.enum(CONTENT_KEYS), draft: contentJson }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "content");
    const { error } = await context.supabase.from("site_content").upsert({ key: data.key, draft: data.draft, updated_by: context.userId }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true, savedAt: new Date().toISOString() };
  });

export const publishSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.enum(CONTENT_KEYS), draft: contentJson }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "content");
    const now = new Date().toISOString();
    const { error } = await context.supabase.from("site_content").upsert({ key: data.key, draft: data.draft, published: data.draft, updated_by: context.userId, published_by: context.userId, published_at: now }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true, publishedAt: now };
  });

// ---------- Media: testimonials, class recording, alumni logos ----------
const mediaSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["testimonial", "class_recording", "logo"]),
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(160).optional().default(""),
  quote: z.string().trim().max(1200).optional().default(""),
  videoUrl: z.string().trim().max(500).optional().default(""),
  imageUrl: z.string().trim().max(500).optional().default(""),
  storagePath: z.string().trim().max(300).optional().default(""),
  sort: z.number().int().min(0).max(10000).optional().default(100),
  active: z.boolean(),
});
const okUrl = (u: string) => !u || u.startsWith("/") || /^https:\/\//i.test(u);

export const listMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePerm(context, "content", "media");
    const { data, error } = await context.supabase.from("site_media").select("*").order("kind").order("sort").order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mediaSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "content", "media");
    if (!okUrl(data.videoUrl) || !okUrl(data.imageUrl)) throw new Error("Links must start with https://");
    if (data.kind === "logo" && !data.imageUrl) throw new Error("Upload a logo image.");
    const row = { kind: data.kind, title: data.title, subtitle: data.subtitle || null, quote: data.quote || null, video_url: data.videoUrl || null, image_url: data.imageUrl || null, storage_path: data.storagePath || null, sort: data.sort, active: data.active };
    const q = data.id ? context.supabase.from("site_media").update(row).eq("id", data.id) : context.supabase.from("site_media").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "content", "media");
    const { data: row } = await context.supabase.from("site_media").select("storage_path").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("site_media").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.storage_path) await context.supabase.storage.from("media").remove([row.storage_path]);
    return { ok: true };
  });

// ---------- Syllabus files ----------
export const listSyllabi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePerm(context, "media", "content");
    const [{ data, error }, { data: leads }] = await Promise.all([
      context.supabase.from("syllabi").select("*").order("created_at", { ascending: false }),
      context.supabase.from("leads").select("id").eq("category", "syllabus").limit(10000),
    ]);
    if (error) throw new Error(error.message);
    return { rows: data ?? [], requests: (leads ?? []).length };
  });

export const saveSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(2).max(160), fileUrl: z.string().trim().url().max(600), storagePath: z.string().max(300).optional().default(""), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "media", "content");
    if (!/^https:\/\//i.test(data.fileUrl)) throw new Error("The link must start with https://");
    const { data: course } = await context.supabase.from("courses").select("id").order("created_at").limit(1).maybeSingle();
    const row = { title: data.title, file_url: data.fileUrl, storage_path: data.storagePath || null, active: data.active, course_id: course?.id ?? null };
    // Only one syllabus is sent at a time: activating one switches the others off.
    if (data.active) await context.supabase.from("syllabi").update({ active: false }).neq("id", data.id ?? "00000000-0000-0000-0000-000000000000");
    const q = data.id ? context.supabase.from("syllabi").update(row).eq("id", data.id) : context.supabase.from("syllabi").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "media", "content");
    const { data: row } = await context.supabase.from("syllabi").select("storage_path").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("syllabi").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row?.storage_path) await context.supabase.storage.from("media").remove([row.storage_path]);
    return { ok: true };
  });

// ---------- Currencies ----------
export const listCurrencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePerm(context, "currencies", "cohorts");
    const { data, error } = await context.supabase.from("currencies").select("*").order("sort").order("code");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).refine((c) => c !== "NGN", "Naira prices are set on the cohort."),
    label: z.string().trim().min(2).max(60), symbol: z.string().max(6).min(1),
    deposit: z.number().min(0).max(10_000_000), earlyTotal: z.number().min(0).max(100_000_000), monthly: z.number().min(0).max(100_000_000),
    chargeable: z.boolean(), active: z.boolean(), sort: z.number().int().min(0).max(1000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "currencies");
    if (data.deposit > data.earlyTotal || data.deposit > data.monthly) throw new Error("The deposit can't be more than the early-bird total or the monthly amount.");
    const { error } = await context.supabase.from("currencies").upsert({ code: data.code, label: data.label, symbol: data.symbol, deposit: data.deposit, early_total: data.earlyTotal, monthly: data.monthly, chargeable: data.chargeable, active: data.active, sort: data.sort }, { onConflict: "code" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^[A-Z]{3}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "currencies");
    const { error } = await context.supabase.from("currencies").delete().eq("code", data.code);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin access (super admin) ----------
const PERM_KEYS = PERMS.map((p) => p[0]) as [string, ...string[]];
export const setAdminAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), preset: z.string().max(30), permissions: z.array(z.enum(PERM_KEYS)).max(PERMS.length).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context);
    const perms = data.preset === "custom" ? data.permissions ?? [] : PRESETS[data.preset]?.perms;
    if (perms === undefined) throw new Error("Unknown role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").update({ preset: data.preset, permissions: perms } as never).eq("user_id", data.userId).eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Automated emails (super admin) ----------
const AUTO_KEYS = AUTO_EMAILS.map((a) => a[0]);
export const getAutomation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuper(context);
    const { data } = await context.supabase.from("app_settings").select("key, value").in("key", ["auto_emails", "summary_recipients"]);
    const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    let flags: Record<string, boolean> = {};
    try { flags = JSON.parse(m["auto_emails"] ?? "{}"); } catch { flags = {}; }
    return { master: flags["master"] !== false, flags: Object.fromEntries(AUTO_KEYS.map((k) => [k, flags[k] !== false])), recipients: (m["summary_recipients"] ?? "fegokendigital@gmail.com,hayjay.okunolaa@gmail.com").split(/[\s,;]+/).filter(Boolean) };
  });

export const saveAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ master: z.boolean().optional(), flags: z.record(z.string(), z.boolean()), recipients: z.array(z.string().trim().toLowerCase().email()).min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuper(context);
    const flags = { master: data.master !== false, ...Object.fromEntries(AUTO_KEYS.map((k) => [k, data.flags[k] !== false])) };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert([{ key: "auto_emails", value: JSON.stringify(flags) }, { key: "summary_recipients", value: [...new Set(data.recipients)].join(",") }], { onConflict: "key" });
    if (error) throw new Error(error.message);
    const { clearAutoEmailCache } = await import("./access.server");
    clearAutoEmailCache();
    return { ok: true };
  });

export const sendSummaryNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuper(context);
    const { sendDailySummary } = await import("./summary.server");
    return sendDailySummary({ force: true });
  });
