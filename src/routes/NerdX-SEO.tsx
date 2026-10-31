import { createFileRoute } from "@tanstack/react-router";
// The NerdX SEO prototype, served as its own full-screen document (no site shell),
// with a waitlist modal injected. The entry-gate flag is filled in per request.
import html from "@/content/nerdx-seo.html?raw";

export const Route = createFileRoute("/NerdX-SEO")({
  server: {
    handlers: {
      GET: async () => {
        let gate = false;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "nerdx_gate").maybeSingle();
          gate = data?.value === "true";
        } catch (e) {
          console.error("[NerdX-SEO] gate read failed", e);
        }
        const body = html.replace("__NX_GATE__", gate ? "true" : "false");
        return new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      },
    },
  },
});
