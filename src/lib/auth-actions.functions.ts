import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SITE = "https://bootcamp.npdacademy.com";
const input = z.object({ email: z.string().trim().email().max(255), password: z.string().min(8).max(128).optional() });

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * 2 ** i)); }
  }
  throw last;
}

async function sendLink(type: "signup" | "recovery", email: string, password?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { renderAuthEmail, sendViaResend } = await import("./auth-emails.server");
  const redirectTo = type === "signup" ? `${SITE}/admin` : `${SITE}/reset-password`;
  const params = type === "signup"
    ? { type: "signup" as const, email, password: password!, options: { redirectTo } }
    : { type: "recovery" as const, email, options: { redirectTo } };
  const { data, error } = await supabaseAdmin.auth.admin.generateLink(params);
  if (error) {
    if (type === "recovery") return { ok: true }; // don't reveal whether an account exists
    if (/already|registered|exists/i.test(error.message)) return { ok: false, error: "An account with this email already exists. Sign in or use Forgot password." };
    console.error("generateLink failed", error.message);
    return { ok: false, error: "We couldn't create your account right now. Please try again." };
  }
  const p = data.properties;
  const link = `${process.env["SUPABASE_URL"]}/auth/v1/verify?token=${p.hashed_token}&type=${type}&redirect_to=${encodeURIComponent(redirectTo)}`;
  const { subject, html } = renderAuthEmail(type, link, p.email_otp);
  try {
    await withRetry(() => sendViaResend(email, subject, html));
  } catch (e) {
    console.error("Resend send failed", e);
    return { ok: false, error: "We couldn't send the email. Please try again in a minute." };
  }
  return { ok: true };
}

export const requestSignup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.required({ password: true }).parse(d))
  .handler(async ({ data }) => sendLink("signup", data.email.toLowerCase(), data.password));

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => sendLink("recovery", data.email.toLowerCase()));
