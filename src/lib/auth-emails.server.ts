import { EMAIL_FROM } from "./payments.server";

const SITE = "https://bootcamp.npdacademy.com";
const LOGO = `${SITE}/brand/logo-dark.png`;

type Copy = { subject: string; heading: string; body: string; cta: string };

const COPY: Record<string, Copy> = {
  signup: { subject: "Confirm your Nerdy Pixels account", heading: "Confirm your email", body: "Welcome to Nerdy Pixels Academy! Please confirm your email address to activate your account.", cta: "Confirm email" },
  invite: { subject: "You've been invited to Nerdy Pixels Academy", heading: "You're invited", body: "You've been invited to join Nerdy Pixels Academy. Click below to accept and set up your account.", cta: "Accept invite" },
  magiclink: { subject: "Your Nerdy Pixels sign-in link", heading: "Sign in", body: "Click the button below to sign in. This link expires shortly and can only be used once.", cta: "Sign in" },
  recovery: { subject: "Reset your Nerdy Pixels password", heading: "Reset your password", body: "We received a request to reset your password. Click below to choose a new one. If you didn't ask for this, you can ignore this email.", cta: "Reset password" },
  email_change: { subject: "Confirm your new email address", heading: "Confirm email change", body: "Please confirm this change of email address for your Nerdy Pixels account.", cta: "Confirm change" },
  reauthentication: { subject: "Your Nerdy Pixels verification code", heading: "Verification code", body: "Use the code below to confirm it's you.", cta: "" },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderAuthEmail(type: string, link: string, token: string) {
  const c: Copy = COPY[type] ?? COPY["magiclink"]!;
  const action = c.cta
    ? `<a href="${esc(link)}" style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px">${c.cta} &rarr;</a>
       <p style="font-size:12px;color:#6b6b80;margin-top:20px">Or use this code: <strong>${esc(token)}</strong></p>`
    : `<p style="font-size:30px;letter-spacing:6px;font-weight:700;color:#3b0f86">${esc(token)}</p>`;
  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Poppins,Arial,sans-serif;color:#1d1b2e">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#3b0f86;border-radius:16px 16px 0 0;padding:24px;text-align:center">
      <img src="${LOGO}" alt="Nerdy Pixels Academy" height="40" style="height:40px;background:#ffffff;border-radius:8px;padding:6px 10px"/>
    </div>
    <div style="border:1px solid #ece6f8;border-top:0;border-radius:0 0 16px 16px;padding:32px 28px">
      <h1 style="font-size:22px;margin:0 0 12px;color:#3b0f86">${c.heading}</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${c.body}</p>
      ${action}
    </div>
    <p style="font-size:12px;color:#8a8aa0;text-align:center;margin-top:18px">Nerdy Pixels Academy &middot; bootcamp.npdacademy.com</p>
  </div></body></html>`;
  return { subject: c.subject, html };
}

export async function sendViaResend(to: string, subject: string, html: string) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend failed [${res.status}]: ${await res.text()}`);
}
