import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, ExternalLink, Search } from "lucide-react";
import { getEnrolments } from "@/lib/admin.functions";
import { previewStudent } from "@/lib/course-config.functions";
import { naira } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/preview")({
  head: () => ({ meta: [
    { title: "View As | Nerdy Pixels Academy Admin" },
    { name: "description", content: "Preview the Nerdy Pixels Academy guest and student experience safely." },
    { property: "og:title", content: "View As | Nerdy Pixels Academy Admin" },
    { property: "og:description", content: "Preview the Nerdy Pixels Academy guest and student experience safely." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Preview,
});

function Preview() {
  const listFn = useServerFn(getEnrolments), previewFn = useServerFn(previewStudent);
  const { data } = useQuery({ queryKey:["admin-enrolments"], queryFn:() => listFn() });
  const [q,setQ] = useState(""), [selected,setSelected] = useState(""), [preview,setPreview] = useState<any>(null), [busy,setBusy] = useState(false);
  const students = (data?.rows ?? []).filter((r) => r.kind === "enrolment" && (!q || [r.name,r.email].some((v) => v.toLowerCase().includes(q.toLowerCase())))).slice(0,50);
  async function view() { if (!selected) return; setBusy(true); try { setPreview(await previewFn({ data:{ enrolmentId:selected } })); } finally { setBusy(false); } }
  if (preview) return <><div className="adm-preview-banner"><span><Eye size={16} /> Read-only student preview: <b>{preview.name}</b></span><button className="adm-btn ghost" onClick={() => setPreview(null)}>Exit preview</button></div><StudentPreview data={preview} /></>;
  return <><div className="adm-head"><h1>View as</h1></div><div className="adm-grid adm-g2">
    <section className="adm-card"><h2 className="adm-section-title">Guest / prospective student</h2><p style={{ color:"var(--a-muted)", fontSize:13 }}>Open the current public enrolment journey in a new tab. Your admin session remains unchanged.</p><a className="adm-btn" href="/courses/digital-marketing?adminPreview=guest" target="_blank" rel="noreferrer">Open guest preview <ExternalLink size={14} /></a></section>
    <section className="adm-card"><h2 className="adm-section-title">Student dashboard</h2><p style={{ color:"var(--a-muted)", fontSize:13 }}>Select an enrolment to inspect exactly what their payment history contains. Preview access is recorded.</p>
      <label className="adm-search" style={{ marginBottom:10 }}><Search size={17}/><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search student name or email" /></label>
      <select className="adm-select" style={{ width:"100%", minHeight:44 }} value={selected} onChange={(e)=>setSelected(e.target.value)}><option value="">Choose a student</option>{students.map((s)=><option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}</select>
      <button className="adm-btn green" style={{ marginTop:12 }} disabled={!selected || busy} onClick={view}>{busy ? "Opening…" : "Preview dashboard"}</button>
    </section></div></>;
}

function StudentPreview({ data }:{ data:any }) {
  return <div className="adm-card"><div className="adm-head"><div><h1 style={{ fontSize:26 }}>Hi {String(data.name).split(" ")[0]}</h1><p style={{ color:"var(--a-muted)", margin:0 }}>{data.email}</p></div>{data.nextDue ? <span className="adm-pill pending">{data.nextDue} instalment due</span> : <span className="adm-pill">All paid up</span>}</div>
    <h2 className="adm-section-title">Payment history</h2><div className="adm-scroll"><table className="adm-table"><thead><tr><th>Date</th><th>Item</th><th className="num">Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{data.rows.map((r:any)=><tr key={r.id}><td>{new Date(r.paid_at ?? r.created_at).toLocaleDateString("en-GB")}</td><td>{r.kind === "instalment" ? `${r.instalment_month} instalment` : r.plan === "early" ? "Bootcamp, early bird" : "Bootcamp, monthly plan"}</td><td className="num money">{r.amount ? naira(r.amount) : "—"}</td><td><span className={`adm-pill ${r.status}`}>{r.status}</span></td><td>{r.tx_ref ?? "—"}</td></tr>)}</tbody></table></div>
    <p style={{ color:"var(--a-muted)", fontSize:12, marginTop:18 }}>Payments, emails, referrals, and profile changes are disabled in preview.</p></div>;
}