import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


async function roleOf(ctx: { supabase: any; userId: string }) {
  const { error: claimError } = await ctx.supabase.rpc("claim_super_admin");
  if (claimError) throw new Error(`Could not verify admin access: ${claimError.message}`);

  const { data, error: roleError } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  if (roleError) throw new Error(`Could not load admin access: ${roleError.message}`);
  const roles = (data ?? []).map((r: { role: string }) => r.role);
  return roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : null;
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ role: await roleOf(context) }));

export const getEnrolments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await roleOf(context);
    if (!role) throw new Error("Forbidden");
    const { data: m } = await context.supabase.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
    const mode = m?.value === "test" ? "test" : "live";
    const { data, error } = await context.supabase
      .from("enrolments")
      .select("*")
      .eq("mode", mode)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return { role, mode, rows: data ?? [] };
  });

export const updateEnrolmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "paid", "failed", "refunded", "registered"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await roleOf(context))) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("enrolments")
      .update({ status: data.status, paid_at: data.status === "paid" ? new Date().toISOString() : null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await roleOf(context))) throw new Error("Forbidden");
    const { data } = await context.supabase.from("user_roles").select("user_id, email, role, created_at").order("created_at");
    return data ?? [];
  });

export const addAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email() }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context)) !== "super_admin") throw new Error("Only the super admin can add admins.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    let userId: string | null = null;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      const u = list?.users.find((x) => x.email?.toLowerCase() === email);
      if (u) userId = u.id;
      if (!list || list.users.length < 200) break;
    }
    if (!userId) throw new Error("No account with that email yet. Ask them to create one on the admin sign-in page first.");
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: userId, email, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context)) !== "super_admin") throw new Error("Only the super admin can remove admins.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const getPaymentModeFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await roleOf(context))) throw new Error("Forbidden");
    const { data } = await context.supabase.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
    return { mode: data?.value === "test" ? "test" : "live" };
  });

export const setPaymentMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: z.enum(["live", "test"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context)) !== "super_admin") throw new Error("Only the super admin can switch payment mode.");
    const { error } = await context.supabase.from("app_settings").update({ value: data.mode }).eq("key", "payment_mode");
    if (error) throw new Error(error.message);
    return { mode: data.mode };
  });

export const sendInstalmentReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email(), month: z.enum(["December", "January"]) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await roleOf(context))) throw new Error("Forbidden");
    const { monthlyStudents, sendReminderEmail } = await import("./reminders.server");
    const { getPaymentMode } = await import("./payments.server");
    const mode = await getPaymentMode();
    const s = (await monthlyStudents(mode)).find((x) => x.email === data.email.toLowerCase());
    if (!s) throw new Error("Student not found on the monthly plan.");
    if (!s.unpaid.includes(data.month)) throw new Error(`${data.month} is already paid.`);
    await sendReminderEmail(s, data.month, "manual");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("instalment_reminders").insert({ email: s.email, month: data.month, stage: "manual", mode, sent_by: context.userId });
    return { ok: true };
  });

export const listReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await roleOf(context))) throw new Error("Forbidden");
    const { data } = await context.supabase.from("instalment_reminders").select("email, month, stage, created_at").order("created_at", { ascending: false }).limit(2000);
    return data ?? [];
  });
