import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function roleOf(ctx: Ctx) {
  await ctx.supabase.rpc("claim_super_admin");
  const { data, error } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  if (error) throw new Error(`Could not load admin access: ${error.message}`);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  return roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : null;
}
async function requireAdmin(ctx: Ctx) {
  const r = await roleOf(ctx);
  if (!r) throw new Error("Forbidden");
  return r;
}
async function modeOf(ctx: Ctx) {
  const { data } = await ctx.supabase.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
  return data?.value === "test" ? "test" : "live";
}

export const getEnrolmentDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row, error } = await context.supabase.from("enrolments").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Enrolment not found.");
    const [{ data: related }, { data: reminders }] = await Promise.all([
      context.supabase.from("enrolments").select("*").eq("email", row.email).eq("mode", row.mode).order("created_at"),
      context.supabase.from("instalment_reminders").select("*").eq("email", row.email.toLowerCase()).order("created_at", { ascending: false }),
    ]);
    return { row, related: related ?? [], reminders: reminders ?? [] };
  });

export const saveEnrolmentNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("enrolments").update({ admin_notes: data.notes }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("enrolments").select("*").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Enrolment not found.");
    if (row.status !== "paid") throw new Error("Only paid enrolments get a welcome email.");
    const { sendReceiptEmail } = await import("./payments.server");
    await sendReceiptEmail(row);
    await context.supabase.from("enrolments").update({ email_sent_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const addManualStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(40).optional().default(""),
        plan: z.enum(["early", "monthly"]),
        amount: z.number().int().min(0).max(10_000_000),
        paymentMethod: z.string().trim().min(2).max(60),
        referralCode: z.string().trim().max(40).optional().default(""),
        paid: z.boolean(),
        sendEmail: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const mode = await modeOf(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      kind: "enrolment",
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      plan: data.plan,
      instalment_month: data.plan === "monthly" ? "November" : null,
      amount: data.amount,
      currency: "NGN",
      status: data.paid ? "paid" : "pending",
      payment_method: data.paymentMethod,
      referral_code: data.referralCode ? data.referralCode.toUpperCase() : null,
      paid_at: data.paid ? new Date().toISOString() : null,
      tx_ref: `MANUAL-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      source_type: "manual",
      mode,
    };
    const { data: ins, error } = await supabaseAdmin.from("enrolments").insert(row as never).select("*").single();
    if (error) throw new Error(error.message);
    if (data.paid && data.sendEmail) {
      const { sendReceiptEmail } = await import("./payments.server");
      await sendReceiptEmail(ins as never).catch((e) => console.error(e));
      await supabaseAdmin.from("enrolments").update({ email_sent_at: new Date().toISOString() } as never).eq("id", (ins as { id: string }).id);
    }
    return { ok: true, id: (ins as { id: string }).id };
  });

export const getCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await requireAdmin(context);
    const mode = await modeOf(context);
    const [{ data: rate }, { data: rows }, { data: payouts }] = await Promise.all([
      context.supabase.from("app_settings").select("value").eq("key", "commission_rate").maybeSingle(),
      context.supabase.from("enrolments").select("referral_code, amount, status, name, created_at").eq("mode", mode).eq("status", "paid").not("referral_code", "is", null).limit(5000),
      context.supabase.from("commission_payouts").select("*").eq("mode", mode).order("created_at", { ascending: false }),
    ]);
    const pct = Number(rate?.value ?? 10);
    const by: Record<string, { code: string; sales: number; revenue: number; paidOut: number }> = {};
    for (const r of rows ?? []) {
      const code = String(r.referral_code || "").trim().toUpperCase();
      if (!code) continue;
      by[code] ??= { code, sales: 0, revenue: 0, paidOut: 0 };
      by[code].sales++;
      by[code].revenue += r.amount;
    }
    for (const p of payouts ?? []) {
      const code = p.referral_code.toUpperCase();
      by[code] ??= { code, sales: 0, revenue: 0, paidOut: 0 };
      by[code].paidOut += p.amount;
    }
    const list = Object.values(by)
      .map((x) => ({ ...x, earned: Math.round((x.revenue * pct) / 100), owed: Math.max(0, Math.round((x.revenue * pct) / 100) - x.paidOut) }))
      .sort((a, b) => b.owed - a.owed || b.revenue - a.revenue);
    return { role, mode, rate: pct, list, payouts: payouts ?? [] };
  });

export const recordPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().min(1).max(40), amount: z.number().int().min(1), note: z.string().max(300).optional().default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const mode = await modeOf(context);
    const { error } = await context.supabase
      .from("commission_payouts")
      .insert({ referral_code: data.code.toUpperCase(), amount: data.amount, note: data.note || null, mode, paid_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCommissionRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rate: z.number().min(0).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context)) !== "super_admin") throw new Error("Only the super admin can change the commission rate.");
    const { error } = await context.supabase.from("app_settings").update({ value: String(data.rate) }).eq("key", "commission_rate");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
