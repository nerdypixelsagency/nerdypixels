// Instalment reminder logic (server-only).
import { EMAIL_FROM } from "./payments.server";

export const DUE_DATES: Record<string, string> = { December: "2026-12-01", January: "2027-01-01" };
const PAY_URL = "https://bootcamp.npdacademy.com/pay-instalment";
export type Stage = "5d" | "1d" | "due" | "missed" | "manual";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function lagosToday() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }).split(",")[0]!);
}
export function daysUntil(month: string) {
  const due = new Date(DUE_DATES[month] + "T00:00:00");
  const t = lagosToday();
  const today = new Date(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

type Student = { name: string; email: string; unpaid: string[] };

export async function monthlyStudents(mode: string): Promise<Student[]> {
  const db = await admin();
  const { data, error } = await db.from("enrolments").select("kind, plan, status, name, email, instalment_month").eq("mode", mode).eq("status", "paid").limit(5000);
  if (error) throw new Error(error.message);
  const m: Record<string, { name: string; email: string; paid: Set<string> }> = {};
  for (const r of data ?? []) {
    const k = r.email.toLowerCase();
    if (r.kind === "enrolment" && r.plan === "monthly") m[k] ??= { name: r.name, email: k, paid: new Set() };
  }
  for (const r of data ?? []) {
    const s = m[r.email.toLowerCase()];
    if (s && r.kind === "instalment" && r.instalment_month) s.paid.add(r.instalment_month);
  }
  return Object.values(m).map((s) => ({ name: s.name, email: s.email, unpaid: Object.keys(DUE_DATES).filter((mo) => !s.paid.has(mo)) }));
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendReminderEmail(s: { name: string; email: string }, month: string, stage: Stage) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("Email is not configured.");
  const d = daysUntil(month);
  const dueText = month === "December" ? "1 December 2026" : "1 January 2027";
  const overdue = d < 0;
  const subject = overdue
    ? `Your ${month} instalment is overdue`
    : d === 0 ? `Your ${month} instalment is due today` : `Reminder: your ${month} instalment is due ${d === 1 ? "tomorrow" : `in ${d} days`}`;
  const first = esc(s.name.trim().split(" ")[0] || "there");
  const lead = overdue
    ? `We haven't received your ${month} instalment of <b>₦40,000</b>, which was due on ${dueText}. Please pay now to keep your place in class.`
    : `Your ${month} instalment of <b>₦40,000</b> is due on <b>${dueText}</b>.`;
  const html = `<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:auto;color:#1A1128">
<div style="background:#2E0B63;color:#fff;padding:28px;border-radius:16px 16px 0 0"><h1 style="margin:0;font-size:22px">Hi ${first},</h1></div>
<div style="border:1px solid #E4DEEE;border-top:0;padding:28px;border-radius:0 0 16px 16px">
<p>${lead}</p>
<p><a href="${PAY_URL}" style="display:inline-block;background:#22C55E;color:#06301A;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:999px">Pay now</a></p>
<p style="color:#574E68;font-size:14px">Already paid? Please ignore this email. Questions? Reply or write to info@npdacademy.com.</p>
<p style="color:#574E68">Nerdy Pixels Academy</p></div></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [s.email], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend failed [${res.status}]: ${await res.text()}`);
}

export function stageFor(month: string): Stage | null {
  const d = daysUntil(month);
  if (d === 5) return "5d";
  if (d === 1) return "1d";
  if (d === 0) return "due";
  if (d <= -3 && d >= -14) return "missed";
  return null;
}

// Daily run: sends each automatic stage at most once per student/month.
export async function runDailyReminders() {
  const db = await admin();
  const { getPaymentMode } = await import("./payments.server");
  const mode = await getPaymentMode();
  const students = await monthlyStudents(mode);
  let sent = 0, failed = 0;
  for (const s of students) {
    for (const month of s.unpaid) {
      const stage = stageFor(month);
      if (!stage) continue;
      const { error: dup } = await db.from("instalment_reminders").insert({ email: s.email, month, stage, mode });
      if (dup) continue; // already sent
      try { await sendReminderEmail(s, month, stage); sent++; }
      catch (e) {
        failed++;
        console.error("Reminder failed", s.email, e);
        await db.from("instalment_reminders").delete().eq("email", s.email).eq("month", month).eq("stage", stage).eq("mode", mode);
      }
    }
  }
  return { mode, students: students.length, sent, failed };
}
