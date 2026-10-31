import { createFileRoute } from "@tanstack/react-router";

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });

// Public endpoint the NerdX SEO landing posts waitlist signups to. Email is
// required; everything else is optional. Deduped by email per mode.
export const Route = createFileRoute("/api/public/nerdx-waitlist")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (!body) return json({ ok: false, error: "Bad request." }, 400);
        if (body["hp"]) return json({ ok: true }); // honeypot: pretend success
        const email = String(body["email"] ?? "").trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 200) return json({ ok: false, error: "Enter a valid email." }, 400);
        const str = (v: unknown, n: number) => {
          const s = String(Array.isArray(v) ? v.join(", ") : (v ?? "")).trim();
          return s ? s.slice(0, n) : null;
        };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: m } = await supabaseAdmin.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
        const mode = m?.value === "test" ? "test" : "live";
        const { data: existing } = await supabaseAdmin.from("nerdx_waitlist").select("id").eq("mode", mode).eq("email", email).limit(1);
        if (!(existing ?? []).length) {
          const row = {
            email,
            name: str(body["name"], 120),
            role: str(body["role"], 60),
            use_case: str(body["useCase"], 300),
            website: str(body["website"], 200),
            challenge: str(body["challenge"], 500),
            timeline: str(body["timeline"], 60),
            beta: body["beta"] === true || body["beta"] === "true",
            source: str(body["source"], 60) || "nerdx-landing",
            mode,
          };
          const { error } = await supabaseAdmin.from("nerdx_waitlist").insert(row as never);
          if (error && !/duplicate/i.test(error.message)) {
            console.error("[nerdx-waitlist]", error.message);
            return json({ ok: false, error: "Could not save. Please try again." }, 500);
          }
        }
        return json({ ok: true });
      },
    },
  },
});
