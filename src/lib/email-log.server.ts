// Server-only: one place that sends every email via Resend and records it in email_log.
import { EMAIL_FROM } from "./payments.server";

const SITE = "https://bootcamp.npdacademy.com";
const LOGO = `${SITE}/brand/logo-dark.png`;

export const escHtml = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Plain admin text -> safe HTML paragraphs. */
export const textToHtml = (t: string) =>
  t.split(/\n{2,}/).map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">${escHtml(p).replace(/\n/g, "<br>")}</p>`).join("");

/** Branded shell. bodyHtml must already be safe HTML. */
export function brandedEmail(heading: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<p style="margin:24px 0 0"><a href="${escHtml(cta.url)}" style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px">${escHtml(cta.label)} &rarr;</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Poppins,Arial,sans-serif;color:#1d1b2e">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#321063;border-radius:16px 16px 0 0;padding:24px;text-align:center"><img src="${LOGO}" alt="Nerdy Pixels Academy" height="40" style="height:40px;background:#ffffff;border-radius:8px;padding:6px 10px"/></div>
<div style="border:1px solid #ece6f8;border-top:0;border-radius:0 0 16px 16px;padding:32px 28px">
<h1 style="font-size:22px;margin:0 0 16px;color:#321063">${escHtml(heading)}</h1>
${bodyHtml}${button}
</div>
<p style="font-size:12px;color:#8a8aa0;text-align:center;margin-top:18px">Nerdy Pixels Academy &middot; bootcamp.npdacademy.com</p>
</div></body></html>`;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function currentMode() {
  const { data } = await (await db()).from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
  return data?.value === "test" ? "test" : "live";
}

export type SendOpts = { type: string; relatedId?: string | null; sentBy?: string | null; mode?: string };

/** Sends and logs. Returns {ok, error}. Never throws. */
export async function sendLogged(to: string, subject: string, html: string, o: SendOpts) {
  let status = "sent", error: string | null = null;
  try {
    const key = process.env["RESEND_API_KEY"];
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    let res: Response | null = null;
    for (let i = 0; i < 3; i++) {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
      });
      if (res.status !== 429) break;
      await new Promise((r) => setTimeout(r, 1200));
    }
    if (!res!.ok) throw new Error(`Resend [${res!.status}]: ${(await res!.text()).slice(0, 300)}`);
  } catch (e) {
    status = "failed"; error = (e as Error).message;
    console.error("email send failed", to, error);
  }
  try {
    await (await db()).from("email_log" as never).insert({
      to_email: to.toLowerCase(), subject, html, type: o.type, related_id: o.relatedId ?? null,
      status, error, mode: o.mode ?? (await currentMode()), sent_by: o.sentBy ?? null,
    } as never);
  } catch (e) { console.error("email_log insert failed", e); }
  return { ok: status === "sent", error };
}

export const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function formConfirmation(first: string, what: string) {
  return {
    subject: "We've received your details — Nerdy Pixels Academy",
    html: brandedEmail(
      `Thanks, ${first}!`,
      textToHtml(`We've received your ${what}. Our team will be in touch shortly.\n\nIn the meantime you can view the bootcamp details and secure your seat any time.`),
      { label: "View the bootcamp", url: SITE },
    ),
  };
}

export function followupEmail(first: string) {
  return {
    subject: "Your seat at Nerdy Pixels Academy is still waiting",
    html: brandedEmail(
      `Hi ${first}, still thinking it over?`,
      textToHtml("You recently showed interest in the Nerdy Pixels Academy Digital Marketing Bootcamp, but you haven't completed your enrolment yet.\n\nSeats are limited, and you can pay in full or spread it into monthly instalments. If you have any questions, just reply to this email — we're happy to help."),
      { label: "Complete my enrolment", url: `${SITE}/#checkout` },
    ),
  };
}

export async function commissionRates() {
  const { data } = await (await db()).from("app_settings").select("key, value").in("key", ["commission_outright_pct", "commission_instalment_pct"]);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return { outright: Number(m["commission_outright_pct"] ?? 10), instalment: Number(m["commission_instalment_pct"] ?? 10) };
}

export function ambassadorEmail(name: string, code: string, rates: { outright: number; instalment: number }) {
  const link = `${SITE}/?ref=${code}`;
  const first = name.trim().split(" ")[0] || "there";
  return {
    subject: "Your Nerdy Pixels Academy referral code and link",
    html: brandedEmail(
      `Hi ${first}, here's your referral code`,
      `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">You're an official ambassador for the Nerdy Pixels Academy Digital Marketing Bootcamp. Share your personal link — your code is remembered and filled in automatically at checkout.</p>
<div style="background:#f7f5fb;border-radius:12px;padding:18px;margin:0 0 16px">
<p style="margin:0 0 6px;font-size:13px;color:#6b6b80">Your referral code</p>
<p style="margin:0 0 14px;font-size:24px;font-weight:700;letter-spacing:2px;color:#321063">${escHtml(code)}</p>
<p style="margin:0 0 6px;font-size:13px;color:#6b6b80">Your shareable link</p>
<p style="margin:0;font-size:15px"><a href="${escHtml(link)}" style="color:#6d28d9">${escHtml(link)}</a></p></div>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">You earn <b>${rates.outright}%</b> of every outright payment and <b>${rates.instalment}%</b> of every confirmed monthly payment from students who use your code. Commission is paid on confirmed payments only.</p>`,
      { label: "Open my link", url: link },
    ),
  };
}
