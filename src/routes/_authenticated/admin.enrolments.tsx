import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getEnrolments, updateEnrolmentStatus } from "@/lib/admin.functions";
import { download, enrolmentsQuery, naira, PERSONAS, toCsv } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/enrolments")({ component: Enrolments });

function Enrolments() {
  const fn = useServerFn(getEnrolments);
  const upd = useServerFn(updateEnrolmentStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(enrolmentsQuery(fn));
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) =>
      (kind === "all" || r.kind === kind) &&
      (status === "all" || r.status === status) &&
      (plan === "all" || r.plan === plan) &&
      (!from || r.created_at.slice(0, 10) >= from) &&
      (!to || r.created_at.slice(0, 10) <= to) &&
      (!t || [r.name, r.email, r.phone, r.referral_code, r.tx_ref].some((v) => v?.toLowerCase().includes(t))),
    );
  }, [data, q, kind, status, plan, from, to]);

  async function setRowStatus(id: string, s: string) {
    await upd({ data: { id, status: s as "paid" } });
    qc.invalidateQueries({ queryKey: ["admin-enrolments"] });
  }

  return (
    <>
      <div className="adm-head"><h1>Enrolments</h1><button className="adm-btn green" onClick={() => download("enrolments.csv", toCsv(rows))}>Export CSV ({rows.length})</button></div>
      <div className="adm-card">
        <div className="adm-filters">
          <input className="adm-input" placeholder="Search name, email, phone, code, reference" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="adm-select" value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">All types</option><option value="enrolment">Enrolments</option><option value="instalment">Instalments</option><option value="event">Free event</option></select>
          <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Any status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option><option value="registered">Registered</option></select>
          <select className="adm-select" value={plan} onChange={(e) => setPlan(e.target.value)}><option value="all">Any plan</option><option value="early">Early bird</option><option value="monthly">Monthly</option></select>
          <input className="adm-select" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <input className="adm-select" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
        {isLoading ? <p className="adm-empty">Loading…</p> : rows.length === 0 ? <p className="adm-empty">No matching records</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Date</th><th>Name</th><th>Contact</th><th>Type</th><th>Persona</th><th>Referral</th><th className="num">Amount</th><th>Status</th><th>Reference</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                <td><b>{r.name}</b></td>
                <td>{r.email}<br /><span style={{ color: "#6b6280" }}>{r.phone}</span></td>
                <td>{r.kind === "event" ? "Free event" : r.kind === "instalment" ? `${r.instalment_month} instalment` : r.plan === "early" ? "Early bird" : "Monthly plan"}</td>
                <td>{PERSONAS[r.persona ?? ""] ?? "—"}</td>
                <td>{r.referral_code ?? "—"}</td>
                <td className="num money">{r.amount ? naira(r.amount) : "—"}</td>
                <td>{r.kind === "event" ? <span className="adm-pill registered">registered</span> : (
                  <select className="adm-select" style={{ padding: "4px 8px" }} value={r.status} onChange={(e) => setRowStatus(r.id, e.target.value)}>
                    {["pending", "paid", "failed", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>)}</td>
                <td style={{ fontSize: 12, color: "#6b6280" }}>{r.tx_ref ?? ""}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
