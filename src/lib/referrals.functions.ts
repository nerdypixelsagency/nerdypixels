import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function roleOf(ctx: Ctx) {
  await ctx.supabase.rpc("claim_super_admin");
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  return roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : null;
}
async function requireAdmin(ctx: Ctx) {
  const r = await roleOf(ctx);
  if (!r) throw new Error("Forbidden");
  return r;
}

const CODE_RE = /^[A-Z0-9-]{4,40}$/;

function makeCode(name: string) {
  const base = name.replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase() || "NPA";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "X");
  return `${base}-${rand}`;
}

// Public: checkout asks "is this referral code real?" — returns only the ambassador's first name.
export const validateReferralCode = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    if (!CODE_RE.test(code)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("ambassadors" as never).select("name, active").eq("code", code).maybeSingle();
    const a = row as { name: string; active: boolean } | null;
    if (!a || !a.active) return { ok: false as const };
    return { ok: true as const, name: a.name.trim().split(" ")[0] };
  });

export const listAmbassadors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase.from("ambassadors").select("*").order("created_at", { ascending: false }).limit(5000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveAmbassador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(255).or(z.literal("")), code: z.string().trim().min(4).max(40), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const code = data.code.toUpperCase();
    if (!CODE_RE.test(code)) throw new Error("Codes can only use letters, numbers and dashes.");
    const row = { name: data.name, email: data.email ? data.email.toLowerCase() : null, code, active: data.active };
    const q = data.id
      ? context.supabase.from("ambassadors").update(row).eq("id", data.id).select("id").maybeSingle()
      : context.supabase.from("ambassadors").insert({ ...row, source: "imported" }).select("id").maybeSingle();
    const { data: saved, error } = await q;
    if (error) throw new Error(error.message.includes("duplicate") ? "That code is already taken." : error.message);
    if (!data.id && row.email) {
      const { ensureStudentRecord, sendAmbassadorEmail } = await import("./email-log.server");
      await ensureStudentRecord(row.email, row.name);
      if (row.active) await sendAmbassadorEmail({ id: saved?.id, ...row }, context.userId);
    }
    return { ok: true };
  });

export const emailAmbassadors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendAmbassadorEmail, pause } = await import("./email-log.server");
    let q = supabaseAdmin.from("ambassadors").select("id, name, email, code").eq("active", true).not("email", "is", null).limit(1000);
    if (data.id) q = q.eq("id", data.id);
    const { data: list } = await q;
    let sent = 0; const failed: string[] = [];
    for (const a of list ?? []) {
      const r = await sendAmbassadorEmail(a, context.userId);
      if (r.ok) sent++; else failed.push(a.email!);
      if ((list ?? []).length > 1) await pause(550);
    }
    return { sent, failed, total: (list ?? []).length };
  });

export const ambassadorEmailStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ refresh: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.refresh) {
      const { data: rows } = await supabaseAdmin.from("email_log" as never).select("id").eq("type", "ambassador").order("created_at", { ascending: false }).limit(200);
      const { refreshDelivery } = await import("./email-log.server");
      await refreshDelivery(((rows ?? []) as { id: string }[]).map((r) => r.id));
    }
    const { data: rows } = await supabaseAdmin.from("email_log" as never).select("to_email, status, delivery_status, created_at").eq("type", "ambassador").order("created_at", { ascending: false }).limit(2000);
    const m: Record<string, { status: string; at: string }> = {};
    for (const r of (rows ?? []) as { to_email: string; status: string; delivery_status: string | null; created_at: string }[])
      if (!m[r.to_email]) m[r.to_email] = { status: r.delivery_status ?? r.status, at: r.created_at };
    return m;
  });

export const getCommissionSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data } = await context.supabase.from("app_settings").select("key, value").in("key", ["commission_outright_pct", "commission_instalment_pct"]);
    const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    return { outright: Number(map["commission_outright_pct"] ?? 10), instalment: Number(map["commission_instalment_pct"] ?? 10) };
  });

export const setCommissionRates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ outright: z.number().min(0).max(100), instalment: z.number().min(0).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context)) !== "super_admin") throw new Error("Only the super admin can change commission rates.");
    for (const [key, value] of [["commission_outright_pct", data.outright], ["commission_instalment_pct", data.instalment]] as const) {
      const { error } = await context.supabase.from("app_settings").update({ value: String(value) }).eq("key", key);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Student portal: every registered student gets their own ambassador code + link.
export const myReferralCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await context.supabase.auth.getUser();
    const email = u.user?.email?.toLowerCase();
    if (!email) throw new Error("No email on this account.");
    const { data: existing } = await supabaseAdmin.from("ambassadors" as never).select("code").eq("email", email).maybeSingle();
    const ex = existing as { code: string } | null;
    if (ex) return { code: ex.code, link: `https://bootcamp.npdacademy.com/?ref=${ex.code}` };
    // Only enrolled students (a record with their email) get a code.
    const { data: rec } = await supabaseAdmin.from("enrolments").select("name").eq("email", email).limit(1).maybeSingle();
    if (!rec) return { code: null, link: null };
    const { ensureAmbassador } = await import("./email-log.server");
    const code = await ensureAmbassador(email, (rec as { name: string }).name || email);
    if (!code) throw new Error("Could not create your referral code. Please try again.");
    return { code, link: `https://bootcamp.npdacademy.com/?ref=${code}` };
  });

// ---- Cohorts ----
export const listCohorts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const [{ data: cohorts, error }, { data: counts }] = await Promise.all([
      context.supabase.from("cohorts").select("*").order("created_at", { ascending: false }),
      context.supabase.from("enrolments").select("cohort_id").not("cohort_id", "is", null).limit(5000),
    ]);
    if (error) throw new Error(error.message);
    const n: Record<string, number> = {};
    for (const r of counts ?? []) n[(r as { cohort_id: string }).cohort_id] = (n[(r as { cohort_id: string }).cohort_id] ?? 0) + 1;
    return (cohorts ?? []).map((c: { id: string }) => ({ ...c, students: n[c.id] ?? 0 }));
  });

export const saveCohort = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(2).max(120),
      course: z.string().trim().min(2).max(120),
      startDate: z.string().trim().max(60).optional().default(""),
      endDate: z.string().trim().max(60).optional().default(""),
      whatsappLink: z.string().trim().max(300).optional().default(""),
      status: z.enum(["open", "closed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: course } = await context.supabase.from("courses").select("id").eq("title", data.course).limit(1).maybeSingle();
    const { data: firstCourse } = course ? { data: null } : await context.supabase.from("courses").select("id").order("created_at").limit(1).maybeSingle();
    const courseId = course?.id ?? firstCourse?.id;
    if (!courseId) throw new Error("Create a course before adding a cohort.");
    const row = { name: data.name, course: data.course, course_id: courseId, start_date: data.startDate || null, end_date: data.endDate || null, whatsapp_link: data.whatsappLink || null, status: data.status };
    const q = data.id ? context.supabase.from("cohorts").update(row).eq("id", data.id) : context.supabase.from("cohorts").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
