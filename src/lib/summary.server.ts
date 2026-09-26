// Daily summary email for the super admin (server-only).
import { EMAIL_FROM, getPaymentMode } from "./payments.server";
import { DUE_DATES, daysUntil, monthlyStudents } from "./reminders.server";

const OWNER = "fegokendigital@gmail.com";
const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

export async function sendDailySummary() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mode = await getPaymentMode();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: rows } = await supabaseAdmin.from("enrolments").select("*").eq("mode", mode).gte("created_at", since).limit(2000);
  const all = (rows ?? []) as Array<{ kind: string; status: string; amount: number; paid_at: string | null; name: string }>;
  const signups = all.filter((r) => r.kind === "enrolment");
  const events = all.filter((r) => r.kind === "event");
  const { data: paidRows } = await supabaseAdmin.from("enrolments").select("amount, name, kind").eq("mode", mode).eq("status", "paid").gte("paid_at", since).limit(2000);
  const received = (paidRows ?? []).reduce((s, r: { amount: number }) => s + r.amount, 0);
  const students = await monthlyStudents(mode);
  const dueLines: string[] = [];
  for (const m of Object.keys(DUE_DATES)) {
    const d = daysUntil(m);
    const unpaid = students.filter((s) => s.unpaid.includes(m)).length;
    if (unpaid && d <= 7) dueLines.push(`${m}: ${unpaid} unpaid (${d < 0 ? `${-d} days overdue` : d === 0 ? "due today" : `due in ${d} days`})`);
  }
  const html = `<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:auto;color:#1A1128">
<div style="background:#2E0B63;color:#fff;padding:24px;border-radius:16px 16px 0 0"><h1 style="margin:0;font-size:22px">Daily summary${mode === "test" ? " (TEST mode)" : ""}</h1></div>
<div style="border:1px solid #E4DEEE;border-top:0;padding:24px;border-radius:0 0 16px 16px">
<p><b>New bootcamp sign-ups:</b> ${signups.length} (${signups.filter((s) => s.status === "paid").length} paid)</p>
<p><b>Free event registrations:</b> ${events.length}</p>
<p><b>Money received:</b> ${naira(received)} from ${(paidRows ?? []).length} payment(s)</p>
<p><b>Payments due soon or overdue:</b><br>${dueLines.length ? dueLines.join("<br>") : "None in the next 7 days"}</p>
<p><a href="https://bootcamp.npdacademy.com/admin" style="display:inline-block;background:#25D366;color:#06301A;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Open the dashboard</a></p>
</div></div>`;
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY missing");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [OWNER], subject: `Nerdy Pixels daily summary: ${signups.length} sign-ups, ${naira(received)} received`, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return { ok: true, signups: signups.length, received };
}
