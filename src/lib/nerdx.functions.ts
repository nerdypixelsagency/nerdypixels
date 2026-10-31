import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePerm } from "./access";

type WaitlistRow = {
  id: string; email: string; name: string | null; role: string | null; use_case: string | null;
  website: string | null; challenge: string | null; timeline: string | null; beta: boolean;
  source: string; mode: string; created_at: string;
};

/** Admin: the NerdX SEO waitlist entries + the current entry-gate setting. */
export const getNerdxWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePerm(context, "nerdx_waitlist");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: rows }, { data: gate }] = await Promise.all([
      supabaseAdmin.from("nerdx_waitlist").select("*").order("created_at", { ascending: false }).limit(10000),
      supabaseAdmin.from("app_settings").select("value").eq("key", "nerdx_gate").maybeSingle(),
    ]);
    return { rows: (rows ?? []) as WaitlistRow[], gate: (gate?.value ?? "false") === "true" };
  });

/** Admin: require visitors to join before viewing the landing (gate on/off). */
export const setNerdxGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ gate: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "nerdx_waitlist");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({ key: "nerdx_gate", value: data.gate ? "true" : "false" }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
