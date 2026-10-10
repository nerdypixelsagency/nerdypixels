// Daily statistics email for the owners (server-only). Recipients and the on/off switch
// are set by the super admin in Admin > Settings.
import { getPaymentMode } from "./payments.server";
import { daysUntilDate, studentsWithInstalments } from "./reminders.server";
import { isEarlyPlan } from "./plans";

const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

type Row = { kind: string; status: string; amount: number; plan: string | null; country: string | null; geo_country: string | null; currency: string | null; charge_amount: number | null; created_at: string; paid_at: string | null; email: string; cohort_id: string | null };

export async function sendDailySummary(opts: { force?: boolean } = {}) {
  const { autoEmailOn, summaryRecipients } = await import("./access.server");
  if (!opts.force && !(await autoEmailOn("daily_summary"))) return { ok: true, skipped: "Daily summary is switched off in Settings." };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mode = await getPaymentMode();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ data: rowsData }, { data: leadsData }, { data: cohort }] = await Promise.all([
    supabaseAdmin.from("enrolments").select("*").eq("mode", mode).limit(10000),
    supabaseAdmin.from("leads").select("category, created_at").eq("mode", mode).gte("created_at", since).limit(5000),
    supabaseAdmin.from("cohorts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const rows = (rowsData ?? []) as unknown as Row[];
  const day = (r: Row) => (r.paid_at ?? r.created_at) >= since;
  const paid = rows.filter((r) => r.status === "paid");
  const paidToday = paid.filter(day);
  const signups = rows.filter((r) => r.kind === "enrolment" && r.created_at >= since);
  const events = rows.filter((r) => r.kind === "event" && r.created_at >= since);
  const received = paidToday.reduce((s, r) => s + r.amount, 0);
  const total = paid.reduce((s, r) => s + r.amount, 0);
  const students = new Set(paid.filter((r) => r.kind === "enrolment").map((r) => r.email.toLowerCase())).size;
  const c = cohort as { id: string; seat_limit: number | null; name: string; start_date: string | null } | null;
  const earlyTaken = c ? new Set(paid.filter((r) => r.kind === "enrolment" && r.cohort_id === c.id && isEarlyPlan(r.plan)).map((r) => r.email.toLowerCase())).size : 0;
  const leads = (leadsData ?? []) as { category: string }[];
  const leadCats: Record<string, number> = {};
  for (const l of leads) leadCats[l.category] = (leadCats[l.category] ?? 0) + 1;
  const byCountry: Record<string, number> = {};
  for (const r of paid.filter((r) => r.kind === "enrolment")) { const k = r.country || r.geo_country || "Unknown"; byCountry[k] = (byCountry[k] ?? 0) + 1; }
  const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const foreign = paidToday.filter((r) => r.currency && r.currency !== "NGN");
  const due = await studentsWithInstalments(mode);
  const dueSoon: Record<string, { n: number; d: number }> = {};
  for (const s of due) for (const u of s.unpaid) { const d = daysUntilDate(u.due); if (d <= 7) { const k = u.key === "Balance" ? "Balance" : u.key; dueSoon[k] = { n: (dueSoon[k]?.n ?? 0) + 1, d }; } }

  const tile = (label: string, value: string, sub = "") => `<td style="padding:6px;width:50%"><div style="background:#F7F5FB;border-radius:14px;padding:14px 16px"><div style="font-size:12px;color:#574E68;text-transform:uppercase;letter-spacing:.08em">${label}</div><div style="font-size:24px;font-weight:800;color:#2E0B63;margin-top:4px">${value}</div>${sub ? `<div style="font-size:12px;color:#574E68">${sub}</div>` : ""}</div></td>`;
  const html = `<div style="font-family:Montserrat,Poppins,Arial,sans-serif;max-width:600px;margin:auto;color:#1A1128">
<div style="background:#2E0B63;color:#fff;padding:24px;border-radius:16px 16px 0 0"><h1 style="margin:0;font-size:22px">Daily statistics${mode === "test" ? " (TEST mode)" : ""}</h1><p style="margin:6px 0 0;color:#DCCFF5;font-size:14px">Last 24 hours · ${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" })}</p></div>
<div style="border:1px solid #E4DEEE;border-top:0;padding:18px;border-radius:0 0 16px 16px">
<table style="width:100%;border-collapse:collapse"><tr>${tile("Received today", naira(received), `${paidToday.length} payment(s)`)}${tile("Total revenue", naira(total), `${students} paid students`)}</tr>
<tr>${tile("New checkouts", String(signups.length), `${signups.filter((s) => s.status === "paid").length} paid`)}${tile("Early-bird seats", c?.seat_limit ? `${Math.max(0, c.seat_limit - earlyTaken)} left` : String(earlyTaken), c?.seat_limit ? `${earlyTaken} of ${c.seat_limit} taken` : "taken")}</tr>
<tr>${tile("New leads", String(leads.length), Object.entries(leadCats).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · "))}${tile("Free class sign-ups", String(events.length))}</tr></table>
${foreign.length ? `<p style="font-size:14px"><b>Paid in other currencies today:</b> ${foreign.map((r) => `${r.currency} ${Number(r.charge_amount ?? 0).toLocaleString("en-US")}`).join(", ")}</p>` : ""}
<p style="font-size:14px"><b>Where students come from:</b> ${topCountries.length ? topCountries.map(([k, v]) => `${k} (${v})`).join(", ") : "No paid students yet"}</p>
<p style="font-size:14px"><b>Payments due in the next 7 days or overdue:</b><br>${Object.keys(dueSoon).length ? Object.entries(dueSoon).map(([k, v]) => `${k}: ${v.n} unpaid (${v.d < 0 ? `${-v.d} days overdue` : v.d === 0 ? "due today" : `due in ${v.d} days`})`).join("<br>") : "None"}</p>
<p><a href="https://bootcamp.npdacademy.com/admin" style="display:inline-block;background:#25D366;color:#06301A;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Open the dashboard</a></p>
</div></div>`;
  const subject = `Nerdy Pixels daily stats: ${signups.length} checkouts, ${naira(received)} received`;
  const { sendLogged } = await import("./email-log.server");
  const to = await summaryRecipients();
  const results = [];
  for (const email of to) results.push({ email, ...(await sendLogged(email, subject, html, { type: "daily_summary", mode })) });
  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length && results.length) throw new Error(`Daily summary failed: ${failed.map((f) => f.error).join("; ")}`);
  return { ok: true, sentTo: results.filter((r) => r.ok).map((r) => r.email), signups: signups.length, received };
}
