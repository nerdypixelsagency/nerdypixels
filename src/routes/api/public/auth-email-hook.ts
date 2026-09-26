import { createFileRoute } from "@tanstack/react-router";
import { Webhook } from "standardwebhooks";
import { renderAuthEmail, sendViaResend } from "@/lib/auth-emails.server";

type Payload = {
  user: { email: string; new_email?: string };
  email_data: {
    token: string; token_hash: string; redirect_to: string; email_action_type: string;
    site_url: string; token_new?: string; token_hash_new?: string;
  };
};

const fail = (message: string, status = 500) =>
  Response.json({ error: { http_code: status, message } }, { status });

export const Route = createFileRoute("/api/public/auth-email-hook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SEND_EMAIL_HOOK_SECRET"];
        if (!secret) return fail("Email hook not configured");
        const body = await request.text();
        let p: Payload;
        try {
          const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));
          p = wh.verify(body, Object.fromEntries(request.headers)) as Payload;
        } catch {
          return fail("Invalid signature", 401);
        }
        const d = p.email_data;
        const base = process.env["SUPABASE_URL"]!;
        const link = (hash: string) =>
          `${base}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(d.email_action_type)}&redirect_to=${encodeURIComponent(d.redirect_to || d.site_url)}`;
        try {
          if (d.email_action_type === "email_change" && d.token_hash_new && p.user.new_email) {
            // Supabase: token_hash pairs with new email, token_hash_new with current email
            const a = renderAuthEmail("email_change", link(d.token_hash_new), d.token);
            await sendViaResend(p.user.email, a.subject, a.html);
            const b = renderAuthEmail("email_change", link(d.token_hash), d.token_new ?? "");
            await sendViaResend(p.user.new_email, b.subject, b.html);
          } else {
            const e = renderAuthEmail(d.email_action_type, link(d.token_hash), d.token);
            await sendViaResend(p.user.email, e.subject, e.html);
          }
        } catch (err) {
          console.error("auth email send failed", err);
          return fail("Could not send email, please try again");
        }
        return Response.json({});
      },
    },
  },
});
