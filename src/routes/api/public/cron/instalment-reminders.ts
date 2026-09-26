import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/cron/instalment-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-cron-token") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("private_settings").select("value").eq("key", "cron_token").maybeSingle();
        const expected = data?.value ?? "";
        const a = Buffer.from(token), b = Buffer.from(expected);
        if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });
        const { runDailyReminders } = await import("@/lib/reminders.server");
        const result = await runDailyReminders();
        return Response.json(result);
      },
    },
  },
});
