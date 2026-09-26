import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getEnrolmentDetail, resendWelcomeEmail, saveEnrolmentNotes } from "@/lib/admin-tools.functions";
import { updateEnrolmentStatus } from "@/lib/admin.functions";
import { naira, PERSONAS, type Enrolment } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/enrolment/$id")({ component: Detail });

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function Detail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getEnrolmentDetail);
  const saveFn = useServerFn(saveEnrolmentNotes);
  const resendFn = useServerFn(resendWelcomeEmail);
  const updFn = useServerFn(updateEnrolmentStatus);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["enrolment", id], queryFn: () => fn({ data: { id } }) });
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setNotes(data.row.admin_notes ?? ""); }, [data]);

  async function run(label: string, f: () => Promise<unknown>) {
    setBusy(true); setMsg("");
    try { await f(); setMsg(label); qc.invalidateQueries({ queryKey: ["enrolment", id] }); qc.invalidateQueries({ queryKey: ["admin-enrolments"] }); }
    catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  if (isLoading) return <p className="adm-empty">Loading…</p>;
  if (error || !data) return <p className="adm-empty">{(error as Error)?.message ?? "Not found"}</p>;
  const r = data.row as Enrolment;
  const rows: [string, React.ReactNode][] = [
    ["Email", r.email], ["Phone", r.phone ?? "—"], ["Country", r.country ?? "—"], ["Persona", PERSONAS[r.persona ?? ""] ?? r.persona ?? "—"],
    ["Heard about us", r.source ?? "—"], ["Plan", r.kind === "event" ? "Free event" : r.plan === "early" ? "Early bird" : r.kind === "instalment" ? `${r.instalment_month} instalment` : "Monthly plan"],
    ["Amount", r.amount ? naira(r.amount) : "—"], ["Status", <span className={`adm-pill ${r.status}`}>{r.status}</span>], ["Payment method", r.payment_method ?? "—"],
    ["Referral code", r.referral_code ?? "—"], ["Added", r.source_type === "manual" ? "Manually by an admin" : "Online checkout"], ["Reference", r.tx_ref ?? "—"],
    ["Created", fmt(r.created_at)], ["Paid", fmt(r.paid_at)], ["Welcome email sent", fmt(r.email_sent_at)],
  ];

  return (
    <>
      <div className="adm-head"><div><Link to="/admin/enrolments" style={{ color: "#6420c9", fontWeight: 600, fontSize: 14 }}>← All enrolments</Link><h1>{r.name}</h1></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="adm-btn green" disabled={busy || r.status !== "paid"} onClick={() => run("Welcome email sent.", () => resendFn({ data: { id } }))}>Resend welcome email</button>
          <button className="adm-btn ghost" disabled={busy || r.status === "refunded"} onClick={() => { if (confirm(`Mark ${r.name}'s payment as refunded? This does not send money back through Flutterwave.`)) run("Marked as refunded.", () => updFn({ data: { id, status: "refunded" } })); }}>Mark refunded</button>
        </div>
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }} role="status">{msg}</div>}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <div className="adm-card"><h2 style={{ fontSize: 16, marginTop: 0 }}>Details</h2>
          <table className="adm-table"><tbody>{rows.map(([k, v]) => <tr key={k}><td style={{ color: "#6b6280", width: 160 }}>{k}</td><td>{v}</td></tr>)}</tbody></table>
        </div>
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className="adm-card"><h2 style={{ fontSize: 16, marginTop: 0 }}>Notes</h2>
            <textarea className="adm-input" style={{ width: "100%", minHeight: 140, padding: 12 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes, only admins can see these" />
            <button className="adm-btn" style={{ marginTop: 8 }} disabled={busy} onClick={() => run("Notes saved.", () => saveFn({ data: { id, notes } }))}>Save notes</button>
          </div>
          <div className="adm-card"><h2 style={{ fontSize: 16, marginTop: 0 }}>Payment history</h2>
            {data.related.length === 0 ? <p className="adm-empty">None</p> : <table className="adm-table"><tbody>{(data.related as Enrolment[]).map((x) => (
              <tr key={x.id}><td>{fmt(x.created_at)}</td><td>{x.kind === "instalment" ? `${x.instalment_month} instalment` : x.kind === "event" ? "Free event" : x.plan === "early" ? "Early bird" : "Monthly plan"}</td><td className="num">{x.amount ? naira(x.amount) : "—"}</td><td><span className={`adm-pill ${x.status}`}>{x.status}</span></td></tr>
            ))}</tbody></table>}
          </div>
          <div className="adm-card"><h2 style={{ fontSize: 16, marginTop: 0 }}>Reminder emails</h2>
            {data.reminders.length === 0 ? <p className="adm-empty">No reminders sent yet</p> : <table className="adm-table"><tbody>{data.reminders.map((m: { id: string; created_at: string; month: string; stage: string }) => (
              <tr key={m.id}><td>{fmt(m.created_at)}</td><td>{m.month}</td><td>{m.stage === "manual" ? "Sent by admin" : m.stage === "missed" ? "Missed payment" : m.stage === "due" ? "Due today" : `${m.stage} before`}</td></tr>
            ))}</tbody></table>}
          </div>
        </div>
      </div>
    </>
  );
}
