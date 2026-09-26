import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getEnrolments, listReminders, sendInstalmentReminder } from "@/lib/admin.functions";
import { enrolmentsQuery } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/instalments")({ component: Instalments });

const MONTHS = ["November", "December", "January"] as const;
const DUE: Record<string, string> = { November: "At enrolment", December: "1 Dec 2026", January: "1 Jan 2027" };

function Instalments() {
  const fn = useServerFn(getEnrolments);
  const { data, isLoading } = useQuery(enrolmentsQuery(fn));
  const remFn = useServerFn(listReminders);
  const sendFn = useServerFn(sendInstalmentReminder);
  const { data: rems, refetch } = useQuery({ queryKey: ["reminders"], queryFn: () => remFn() });
  const [busy, setBusy] = useState("");
  const lastSent = (email: string, month: string) => {
    const r = (rems ?? []).find((x) => x.email === email.toLowerCase() && x.month === month);
    return r ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
  };
  async function remind(email: string, month: string) {
    const k = email + month;
    setBusy(k);
    try { await sendFn({ data: { email, month: month as "December" | "January" } }); await refetch(); alert(`Reminder sent to ${email}.`); }
    catch (e) { alert(e instanceof Error ? e.message : "Couldn't send the reminder."); }
    finally { setBusy(""); }
  }

  const students = useMemo(() => {
    const rows = data?.rows ?? [];
    const m: Record<string, { name: string; email: string; phone: string | null; paid: Set<string> }> = {};
    rows.filter((r) => r.kind === "enrolment" && r.plan === "monthly" && r.status === "paid").forEach((r) => {
      const k = r.email.toLowerCase();
      m[k] ??= { name: r.name, email: r.email, phone: r.phone, paid: new Set() };
      m[k].paid.add("November");
    });
    rows.filter((r) => r.kind === "instalment" && r.status === "paid").forEach((r) => {
      const k = r.email.toLowerCase();
      m[k] ??= { name: r.name, email: r.email, phone: r.phone, paid: new Set() };
      if (r.instalment_month) m[k].paid.add(r.instalment_month);
    });
    return Object.values(m);
  }, [data]);

  const now = new Date();
  const isOverdue = (mo: string) => (mo === "December" ? now >= new Date("2026-12-04") : mo === "January" ? now >= new Date("2027-01-04") : false);
  const isDue = (mo: string) => (mo === "December" ? now >= new Date("2026-12-01") : mo === "January" ? now >= new Date("2027-01-01") : true);

  return (
    <>
      <div className="adm-head"><h1>Instalments</h1></div>
      <div className="adm-card">
        <p style={{ margin: 0, color: "#6b6280", fontSize: 13 }}>Students on the monthly plan (₦40,000 × 3). Green is paid, amber is due, red is overdue (3+ days late), grey is not yet due. Reminders are emailed automatically 5 days before, 1 day before, on the 1st, and 3 days after if unpaid.</p>
        {isLoading ? <p className="adm-empty">Loading…</p> : students.length === 0 ? <p className="adm-empty">No monthly-plan students yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Student</th><th>WhatsApp</th>{MONTHS.map((m) => <th key={m}>{m}<br /><span style={{ fontWeight: 400, textTransform: "none" }}>{DUE[m]}</span></th>)}</tr></thead>
            <tbody>{students.map((s) => (
              <tr key={s.email}>
                <td><b>{s.name}</b><br /><span style={{ color: "#6b6280" }}>{s.email}</span></td>
                <td>{s.phone ?? "—"}</td>
                {MONTHS.map((m) => (
                  <td key={m}>
                    {s.paid.has(m) ? <span className="adm-pill">paid</span> : isOverdue(m) ? <span className="adm-pill failed" style={{ background: "#fde2e2", color: "#a11" }}>overdue</span> : isDue(m) ? <span className="adm-pill pending">due</span> : <span className="adm-pill registered" style={{ background: "#f1eff5", color: "#6b6280" }}>upcoming</span>}
                    {!s.paid.has(m) && m !== "November" && (
                      <div style={{ marginTop: 6 }}>
                        <button className="adm-btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} disabled={busy === s.email + m} onClick={() => remind(s.email, m)}>{busy === s.email + m ? "Sending…" : "Send reminder"}</button>
                        {lastSent(s.email, m) && <div style={{ fontSize: 11, color: "#6b6280", marginTop: 3 }}>Last sent {lastSent(s.email, m)}</div>}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
