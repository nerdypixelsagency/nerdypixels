// Instalment reminder logic (server-only). Works from each student's own plan schedule,
// so deposit balances, December and January instalments all get reminders.
import { EMAIL_FROM, formatMoney } from "./payments.server";
import { hasInstalments, longDate, pricingFromCohort, unpaidItems, MONTH_DUE, type InstalmentKey, type Pricing } from "./plans";

/** Kept for older callers: the fixed monthly due dates. */
export const DUE_DATES: Record<string, string> = MONTH_DUE;
const PAY_URL = "https://bootcamp.npdacademy.com/pay-instalment";
export type Stage = "5d" | "1d" | "due" | "missed" | "manual";
export type DueItem = { key: InstalmentKey; label: string; amount: number; due: string; money: string };
export type Student = { name: string; email: string; plan: string; unpaid: DueItem[] };

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function lagosToday() {
  const t = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  return new Date(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T00:00:00`);
}
export function daysUntilDate(iso: string) {
  const due = new Date(iso.slice(0, 10) + "T00:00:00");
  return Math.round((due.getTime() - lagosToday().getTime()) / 86400000);
}
export const daysUntil = (month: string) => daysUntilDate(DUE_DATES[month] ?? month);

type Cur = { code: string; symbol: string; deposit: number; early_total: number; monthly: number };

export async function studentsWithInstalments(mode: string): Promise<Student[]> {
  const db = await admin();
  const [{ data, error }, { data: cohorts }, { data: curs }] = await Promise.all([
    db.from("enrolments").select("kind, plan, status, name, email, instalment_month, cohort_id, currency").eq("mode", mode).eq("status", "paid").limit(10000),
    db.from("cohorts").select("*").order("created_at", { ascending: false }),
    db.from("currencies" as never).select("*"),
  ]);
  if (error) throw new Error(error.message);
  const pricingOf: Record<string, Pricing> = {};
  for (const c of cohorts ?? []) pricingOf[(c as { id: string }).id] = pricingFromCohort(c as never);
  const fallback = pricingFromCohort((cohorts ?? []).find((c) => (c as { status: string }).status === "open") as never);
  const curOf = Object.fromEntries(((curs ?? []) as Cur[]).map((c) => [c.code, c]));
  const m: Record<string, { name: string; email: string; plan: string; cohort: string | null; currency: string; paid: Set<string> }> = {};
  for (const r of data ?? []) {
    const k = r.email.toLowerCase();
    if (r.kind === "enrolment" && hasInstalments(r.plan)) m[k] ??= { name: r.name, email: k, plan: r.plan!, cohort: r.cohort_id, currency: (r as { currency?: string }).currency || "NGN", paid: new Set() };
  }
  for (const r of data ?? []) {
    const s = m[r.email.toLowerCase()];
    if (s && r.kind === "instalment" && r.instalment_month) s.paid.add(r.instalment_month);
  }
  return Object.values(m).map((s) => {
    const base = (s.cohort && pricingOf[s.cohort]) || fallback;
    const c = s.currency !== "NGN" ? curOf[s.currency] : undefined;
    const local: Pricing = c ? { ...base, deposit: Number(c.deposit), early: Number(c.early_total), monthly: Number(c.monthly) } : base;
    const unpaid = unpaidItems(s.plan, s.paid, base)
      .filter((i) => i.due)
      .map((i) => {
        const amt = unpaidItems(s.plan, s.paid, local).find((x) => x.key === i.key)?.amount ?? i.amount;
        return { key: i.key as InstalmentKey, label: i.label, amount: i.amount, due: i.due!, money: formatMoney(amt, c ? c.code : "NGN", c?.symbol) };
      });
    return { name: s.name, email: s.email, plan: s.plan, unpaid };
  });
}

/** Kept for older callers: monthly-plan students and the names of their unpaid payments. */
export async function monthlyStudents(mode: string) {
  return (await studentsWithInstalments(mode)).map((s) => ({ ...s, unpaidKeys: s.unpaid.map((u) => u.key) }));
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendReminderEmail(s: { name: string; email: string }, item: DueItem, stage: Stage) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("Email is not configured.");
  const d = daysUntilDate(item.due);
  const dueText = longDate(item.due, false);
  const what = item.key === "Balance" ? "balance" : `${item.key} instalment`;
  const overdue = d < 0;
  const subject = overdue
    ? `Your ${what} is overdue`
    : d === 0 ? `Your ${what} is due today` : `Reminder: your ${what} is due ${d === 1 ? "tomorrow" : `in ${d} days`}`;
  const first = esc(s.name.trim().split(" ")[0] || "there");
  const lead = overdue
    ? `We haven't received your ${what} of <b>${item.money}</b>, which was due on ${dueText}. Please pay now to keep your place in class.`
    : `Your ${what} of <b>${item.money}</b> is due on <b>${dueText}</b>.`;
  const html = `<div style="font-family:Montserrat,Poppins,Arial,sans-serif;max-width:560px;margin:auto;color:#1A1128">
<div style="background:#2E0B63;color:#fff;padding:28px;border-radius:16px 16px 0 0"><h1 style="margin:0;font-size:22px">Hi ${first},</h1></div>
<div style="border:1px solid #E4DEEE;border-top:0;padding:28px;border-radius:0 0 16px 16px">
<p>${lead}</p>
<p><a href="${PAY_URL}" style="display:inline-block;background:#22C55E;color:#06301A;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:999px">Pay now</a></p>
<p style="color:#574E68;font-size:14px">Already paid? Please ignore this email. Questions? Reply or write to info@hello.npdacademy.com.</p>
<p style="color:#574E68">Nerdy Pixels Academy</p></div></div>`;
  const { sendLogged } = await import("./email-log.server");
  const r = await sendLogged(s.email, subject, html, { type: "instalment_reminder" });
  if (!r.ok) throw new Error(r.error ?? "Email failed");
  void EMAIL_FROM;
}

export function stageFor(due: string): Stage | null {
  const d = daysUntilDate(due);
  if (d === 5) return "5d";
  if (d === 1) return "1d";
  if (d === 0) return "due";
  if (d <= -3 && d >= -14) return "missed";
  return null;
}

// Daily run: sends each automatic stage at most once per student/payment.
export async function runDailyReminders() {
  const db = await admin();
  const { getPaymentMode } = await import("./payments.server");
  const mode = await getPaymentMode();
  const { autoEmailOn } = await import("./access.server");
  if (!(await autoEmailOn("reminders"))) return { mode, students: 0, sent: 0, failed: 0, skipped: "Instalment reminders are switched off in Settings." };
  const students = await studentsWithInstalments(mode);
  let sent = 0, failed = 0;
  for (const s of students) {
    for (const item of s.unpaid) {
      const stage = stageFor(item.due);
      if (!stage) continue;
      const { error: dup } = await db.from("instalment_reminders").insert({ email: s.email, month: item.key, stage, mode });
      if (dup) continue; // already sent
      try { await sendReminderEmail(s, item, stage); sent++; }
      catch (e) {
        failed++;
        console.error("Reminder failed", s.email, e);
        await db.from("instalment_reminders").delete().eq("email", s.email).eq("month", item.key).eq("stage", stage).eq("mode", mode);
      }
    }
  }
  return { mode, students: students.length, sent, failed };
}
