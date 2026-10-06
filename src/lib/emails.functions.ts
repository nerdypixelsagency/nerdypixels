import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function requireAdmin(ctx: Ctx) {
  await ctx.supabase.rpc("claim_super_admin");
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  if (!(data ?? []).length) throw new Error("Forbidden");
}

const AUDIENCES = ["ambassadors", "unpaid_leads", "paid_students", "monthly_students", "cohort"] as const;
type Recipient = { email: string; name: string; code?: string };

async function resolveAudience(audience: (typeof AUDIENCES)[number], cohortId?: string): Promise<Recipient[]> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { currentMode } = await import("./email-log.server");
  const mode = await currentMode();
  const uniq = (list: Recipient[]) => {
    const m = new Map<string, Recipient>();
    for (const r of list) if (r.email && !m.has(r.email.toLowerCase())) m.set(r.email.toLowerCase(), { ...r, email: r.email.toLowerCase() });
    return [...m.values()];
  };
  if (audience === "ambassadors") {
    const { data } = await db.from("ambassadors").select("name, email, code").eq("active", true).not("email", "is", null).limit(5000);
    return uniq((data ?? []).map((a) => ({ email: a.email!, name: a.name, code: a.code })));
  }
  if (audience === "unpaid_leads") return (await leadsWithStatus(mode)).filter((l) => l.pay_status !== "paid").map((l) => ({ email: l.email, name: `${l.first_name} ${l.last_name}` }));
  let q = db.from("enrolments").select("name, email, plan, cohort_id").eq("status", "paid").eq("mode", mode).neq("kind", "event").limit(5000);
  if (audience === "monthly_students") q = q.eq("plan", "monthly");
  if (audience === "cohort") { if (!cohortId) throw new Error("Choose a cohort."); q = q.eq("cohort_id", cohortId); }
  const { data } = await q;
  return uniq((data ?? []).map((r) => ({ email: r.email, name: r.name })));
}

async function leadsWithStatus(mode: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [{ data: leads }, { data: enr }] = await Promise.all([
    db.from("leads").select("*").eq("mode", mode).order("created_at", { ascending: false }).limit(5000),
    db.from("enrolments").select("email, status").eq("mode", mode).neq("kind", "event").limit(10000),
  ]);
  const st = new Map<string, string>();
  for (const e of enr ?? []) {
    const k = e.email.toLowerCase();
    if (e.status === "paid" || e.status === "existing") st.set(k, "paid");
    else if (!st.has(k)) st.set(k, "checkout_started");
  }
  return (leads ?? []).map((l) => ({ ...l, pay_status: st.get(l.email.toLowerCase()) ?? "not_paid" }));
}

export const getLeadsWithStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { currentMode } = await import("./email-log.server");
    const mode = await currentMode();
    return { mode, rows: await leadsWithStatus(mode) };
  });

export const listEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase.from("email_log").select("id, to_email, subject, type, status, error, created_at, mode").order("created_at", { ascending: false }).limit(2000);
    if (error) throw new Error(error.message);
    return data as { id: string; to_email: string; subject: string; type: string; status: string; error: string | null; created_at: string; mode: string }[];
  });

export const getEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("email_log").select("*").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Email not found.");
    return row as { id: string; to_email: string; subject: string; html: string; type: string; status: string; error: string | null; created_at: string };
  });

export const resendEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("email_log").select("*").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Email not found.");
    const { sendLogged } = await import("./email-log.server");
    const r = await sendLogged(row.to_email, row.subject, row.html, { type: row.type, relatedId: row.related_id, sentBy: context.userId });
    if (!r.ok) throw new Error(r.error ?? "Send failed");
    return { ok: true };
  });

const composeSchema = z.object({
  subject: z.string().trim().min(2).max(200),
  heading: z.string().trim().min(1).max(150),
  body: z.string().trim().min(1).max(8000),
  ctaLabel: z.string().trim().max(60).optional().default(""),
  ctaUrl: z.string().trim().url().max(500).or(z.literal("")).optional().default(""),
});

async function buildCustom(c: z.infer<typeof composeSchema>, name: string) {
  const { brandedEmail, textToHtml } = await import("./email-log.server");
  const first = name.trim().split(" ")[0] || "there";
  const fill = (s: string) => s.replace(/\{\{\s*name\s*\}\}/gi, first);
  return { subject: fill(c.subject), html: brandedEmail(fill(c.heading), textToHtml(fill(c.body)), c.ctaLabel && c.ctaUrl ? { label: c.ctaLabel, url: c.ctaUrl } : undefined) };
}

export const previewCustomEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => composeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    return buildCustom(data, "Ada Lovelace");
  });

export const audienceCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ audience: z.enum(AUDIENCES), cohortId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    return { count: (await resolveAudience(data.audience, data.cohortId)).length };
  });

export const sendCustomEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    composeSchema.extend({
      target: z.enum(["single", ...AUDIENCES]),
      to: z.string().trim().email().max(255).optional(),
      name: z.string().trim().max(120).optional().default(""),
      cohortId: z.string().uuid().optional(),
      template: z.enum(["custom", "ambassador"]).default("custom"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { sendLogged, pause, ambassadorEmail, commissionRates } = await import("./email-log.server");
    let list: Recipient[];
    if (data.target === "single") {
      if (!data.to) throw new Error("Enter a recipient email.");
      list = [{ email: data.to.toLowerCase(), name: data.name }];
      if (data.template === "ambassador") {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: a } = await supabaseAdmin.from("ambassadors").select("name, code").eq("email", list[0]!.email).maybeSingle();
        if (!a) throw new Error("No ambassador with that email.");
        list = [{ email: list[0]!.email, name: a.name, code: a.code }];
      }
    } else list = await resolveAudience(data.target, data.cohortId);
    if (data.template === "ambassador" && data.target !== "single" && data.target !== "ambassadors") throw new Error("The ambassador template can only go to ambassadors.");
    if (list.length > 400) throw new Error(`That group has ${list.length} people; the limit per send is 400.`);
    const rates = data.template === "ambassador" ? await commissionRates() : null;
    const failed: { email: string; error: string }[] = [];
    let sent = 0;
    for (const r of list) {
      const m = rates && r.code ? ambassadorEmail(r.name, r.code, rates) : await buildCustom(data, r.name);
      const res = await sendLogged(r.email, m.subject, m.html, { type: data.template === "ambassador" ? "ambassador" : data.target === "single" ? "custom" : `bulk:${data.target}`, sentBy: context.userId });
      if (res.ok) sent++; else failed.push({ email: r.email, error: res.error ?? "failed" });
      if (list.length > 1) await pause(550);
    }
    return { sent, failed, total: list.length };
  });

export const sendLeadFollowups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.string().uuid()).max(400).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { sendLogged, pause, followupEmail, currentMode } = await import("./email-log.server");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    let leads = (await leadsWithStatus(await currentMode())).filter((l) => l.pay_status !== "paid");
    if (data.ids) leads = leads.filter((l) => data.ids!.includes(l.id));
    const seen = new Set<string>();
    let sent = 0; const failed: string[] = [];
    for (const l of leads) {
      const k = l.email.toLowerCase();
      if (seen.has(k)) continue; seen.add(k);
      const m = followupEmail(l.first_name);
      const r = await sendLogged(k, m.subject, m.html, { type: "lead_followup", relatedId: l.id, sentBy: context.userId });
      if (r.ok) {
        sent++;
        await db.from("leads").update({ followup_count: (l.followup_count ?? 0) + 1, last_followup_at: new Date().toISOString() } as never).eq("id", l.id);
      } else failed.push(k);
      if (leads.length > 1) await pause(550);
    }
    return { sent, failed, skippedPaid: data.ids ? data.ids.length - leads.length : 0 };
  });

export const listCohortOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data } = await context.supabase.from("cohorts").select("id, name").order("created_at", { ascending: false });
    return (data ?? []) as { id: string; name: string }[];
  });
