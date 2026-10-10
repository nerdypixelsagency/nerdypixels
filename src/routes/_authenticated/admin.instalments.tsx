import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getEnrolments, listReminders, sendInstalmentReminder } from "@/lib/admin.functions";
import { getPublicCourseConfig } from "@/lib/course-config.functions";
import { enrolmentsQuery, naira } from "@/components/admin/data";
import { FilterToolbar } from "@/components/admin/FilterToolbar";
import { hasInstalments, longDate, planLabel, scheduleFor, type Pricing } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/admin/instalments")({ component: Instalments });

const COLS = [["first", "First payment"], ["Balance", "Balance"], ["December", "December"], ["January", "January"]] as const;

function Instalments() {
  const fn = useServerFn(getEnrolments);
  const { data, isLoading } = useQuery(enrolmentsQuery(fn));
  const cfgFn = useServerFn(getPublicCourseConfig);
  const { data: cfg } = useQuery({ queryKey: ["public-config"], queryFn: () => cfgFn() });
  const remFn = useServerFn(listReminders);
  const sendFn = useServerFn(sendInstalmentReminder);
  const { data: rems, refetch } = useQuery({ queryKey: ["reminders"], queryFn: () => remFn() });
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState("");
  const pricing: Pricing = { deposit: cfg?.depositAmount ?? 0, early: cfg?.earlyBirdPrice ?? 60000, monthly: cfg?.instalmentAmount ?? 40000, count: cfg?.instalmentCount ?? 3, balanceDue: cfg?.balanceDueDate ?? null };
  const lastSent = (email: string, key: string) => {
    const r = (rems ?? []).find((x) => x.email === email.toLowerCase() && x.month === key);
    return r ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
  };
  async function remind(email: string, key: string) {
    setBusy(email + key);
    try { await sendFn({ data: { email, month: key as "Balance" | "December" | "January" } }); await refetch(); alert(`Reminder sent to ${email}.`); }
    catch (e) { alert(e instanceof Error ? e.message : "Couldn't send the reminder."); }
    finally { setBusy(""); }
  }

  const students = useMemo(() => {
    const rows = data?.rows ?? [];
    const m: Record<string, { name: string; email: string; phone: string | null; plan: string; paid: Set<string> }> = {};
    rows.filter((r) => r.kind === "enrolment" && r.status === "paid" && hasInstalments(r.plan)).forEach((r) => {
      m[r.email.toLowerCase()] ??= { name: r.name, email: r.email, phone: r.phone, plan: r.plan!, paid: new Set(["first"]) };
    });
    rows.filter((r) => r.kind === "instalment" && r.status === "paid").forEach((r) => { const s = m[r.email.toLowerCase()]; if (s && r.instalment_month) s.paid.add(r.instalment_month); });
    const t = search.trim().toLowerCase();
    return Object.values(m).filter((s) => (!t || [s.name, s.email, s.phone].some((v) => v?.toLowerCase().includes(t))) && (!only || s.plan === only));
  }, [data, search, only]);

  const today = new Date().toISOString().slice(0, 10);
  const daysPast = (due: string) => Math.floor((Date.parse(today) - Date.parse(due)) / 864e5);

  return (
    <>
      <div className="adm-head"><h1>Instalments</h1></div>
      <FilterToolbar search={search} onSearch={setSearch} placeholder="Search student name, email, or phone" active={!!search || !!only} onReset={() => { setSearch(""); setOnly(""); }}>
        <select className="adm-select" value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Plan"><option value="">All plans</option>{["deposit_monthly", "deposit_early", "monthly"].map((p) => <option key={p} value={p}>{planLabel(p)}</option>)}</select>
      </FilterToolbar>
      <div className="adm-card">
        <p style={{ margin: 0, color: "#6b6280", fontSize: 13 }}>Students who still owe payments after their first one. Green is paid, amber is due, red is overdue (3+ days late), grey is upcoming, and a dash means it isn't part of their plan. Reminders go out automatically 5 days before, 1 day before, on the due date and 3 days after, unless they're switched off in Settings.</p>
        {isLoading ? <p className="adm-empty">Loading…</p> : students.length === 0 ? <p className="adm-empty">No students with payments to come</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Student</th><th>Plan</th>{COLS.map(([k, l]) => <th key={k}>{l}<br /><span style={{ fontWeight: 400, textTransform: "none" }}>{k === "first" ? "At enrolment" : k === "Balance" ? (pricing.balanceDue ? longDate(pricing.balanceDue, false) : "—") : k === "December" ? "1 Dec 2026" : "1 Jan 2027"}</span></th>)}</tr></thead>
            <tbody>{students.map((s) => {
              const sched = scheduleFor(s.plan, pricing);
              return (
                <tr key={s.email}>
                  <td><b>{s.name}</b><br /><span style={{ color: "#6b6280" }}>{s.email}</span>{s.phone && <><br /><span style={{ color: "#6b6280" }}>{s.phone}</span></>}</td>
                  <td>{planLabel(s.plan)}</td>
                  {COLS.map(([k]) => {
                    const item = k === "first" ? sched[0] : sched.find((i) => i.key === k);
                    if (!item) return <td key={k} style={{ color: "#b5adc6" }}>—</td>;
                    const paid = s.paid.has(k === "first" ? "first" : k);
                    const late = item.due ? daysPast(item.due) : -1;
                    return (
                      <td key={k}>
                        {paid ? <span className="adm-pill">paid</span> : late >= 3 ? <span className="adm-pill failed" style={{ background: "#fde2e2", color: "#a11" }}>overdue</span> : late >= 0 ? <span className="adm-pill pending">due</span> : <span className="adm-pill registered" style={{ background: "#f1eff5", color: "#6b6280" }}>upcoming</span>}
                        <div style={{ fontSize: 12, color: "#6b6280", marginTop: 3 }}>{naira(item.amount)}</div>
                        {!paid && k !== "first" && (
                          <div style={{ marginTop: 6 }}>
                            <button className="adm-btn ghost" style={{ padding: "4px 10px", fontSize: 12 }} disabled={busy === s.email + k} onClick={() => remind(s.email, k)}>{busy === s.email + k ? "Sending…" : "Send reminder"}</button>
                            {lastSent(s.email, k) && <div style={{ fontSize: 11, color: "#6b6280", marginTop: 3 }}>Last sent {lastSent(s.email, k)}</div>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
