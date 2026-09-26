import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>; userId: string };

async function roleOf(ctx: { supabase: any; userId: string }) {
  await ctx.supabase.rpc("claim_super_admin");
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
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
    const { data, error } = await context.supabase
      .from("enrolments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return { role, rows: data ?? [] };
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

export type { Ctx };
