import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { audienceCount, getEmail, listCohortOptions, listEmails, previewCustomEmail, resendEmail, sendCustomEmail } from "@/lib/emails.functions";
import { FilterToolbar } from "@/components/admin/FilterToolbar";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  head: () => ({ meta: [{ title: "Emails | Nerdy Pixels Admin" }, { name: "description", content: "Track, preview, send and resend Nerdy Pixels Academy emails." }, { name: "robots", content: "noindex" }] }),
  component: Emails,
});

const TYPES: Record<string, string> = {
  payment_welcome: "Payment welcome", payment_receipt: "Instalment receipt", form_confirmation: "Form confirmation",
  lead_followup: "Lead follow-up", ambassador: "Ambassador notice", custom: "Custom",
};
const typeLabel = (t: string) => TYPES[t] ?? (t.startsWith("bulk:") ? `Bulk · ${t.slice(5).replace(/_/g, " ")}` : t);
const TARGETS = [
  ["single", "One person"], ["ambassadors", "All ambassadors"], ["unpaid_leads", "Leads not yet paid"],
  ["paid_students", "All paid students"], ["monthly_students", "Monthly-plan students"], ["cohort", "A cohort"],
] as const;
type Target = (typeof TARGETS)[number][0];

function Emails() {
  const listFn = useServerFn(listEmails);
  const getFn = useServerFn(getEmail);
  const resendFn = useServerFn(resendEmail);
  const previewFn = useServerFn(previewCustomEmail);
  const sendFn = useServerFn(sendCustomEmail);
  const countFn = useServerFn(audienceCount);
  const cohortFn = useServerFn(listCohortOptions);
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["admin-emails"], queryFn: () => listFn() });
  const { data: cohorts = [] } = useQuery({ queryKey: ["cohort-options"], queryFn: () => cohortFn() });

  const [s, setS] = useState(""); const [type, setType] = useState(""); const [status, setStatus] = useState("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [view, setView] = useState<{ subject: string; html: string; to?: string; id?: string } | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState({ template: "custom" as "custom" | "ambassador", target: "single" as Target, to: "", name: "", cohortId: "", subject: "", heading: "", body: "", ctaLabel: "", ctaUrl: "" });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const rows = useMemo(() => {
    const t = s.trim().toLowerCase();
    return data.filter((r) => (!type || r.type === type || (type === "bulk" && r.type.startsWith("bulk:"))) && (!status || r.status === status) &&
      (!from || r.created_at.slice(0, 10) >= from) && (!to || r.created_at.slice(0, 10) <= to) &&
      (!t || r.to_email.includes(t) || r.subject.toLowerCase().includes(t)));
  }, [data, s, type, status, from, to]);
  const stats = { total: data.length, failed: data.filter((r) => r.status === "failed").length };

  const payload = () => ({ ...form, to: form.to || undefined, cohortId: form.cohortId || undefined,
    subject: form.subject || "Your Nerdy Pixels Academy referral code and link", heading: form.heading || "Hello", body: form.body || "-" });

  async function open(id: string) {
    try { const e = await getFn({ data: { id } }); setView({ subject: e.subject, html: e.html, to: e.to_email, id: e.id }); } catch (e) { setMsg((e as Error).message); }
  }
  async function resend(id: string) {
    setBusy(true); setMsg("");
    try { await resendFn({ data: { id } }); setMsg("Email resent."); qc.invalidateQueries({ queryKey: ["admin-emails"] }); } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  async function preview() {
    setMsg("");
    if (form.template === "ambassador") { setMsg("Ambassador emails are personalised with each person's code and link, plus your current commission rates."); return; }
    try { const p = await previewFn({ data: payload() }); setView(p); } catch (e) { setMsg((e as Error).message); }
  }
  async function send() {
    setMsg("");
    try {
      if (form.target !== "single") {
        const { count } = await countFn({ data: { audience: form.target, cohortId: form.cohortId || undefined } });
        if (!confirm(`Send this email to ${count} people?`)) return;
      }
      setBusy(true);
      const r = await sendFn({ data: payload() });
      setMsg(`Sent ${r.sent} of ${r.total}.${r.failed.length ? ` Failed: ${r.failed.map((f) => f.email).join(", ")}` : ""}`);
      qc.invalidateQueries({ queryKey: ["admin-emails"] });
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  return (
    <>
      <div className="adm-head"><h1>Emails</h1>
        <button className="adm-btn green" onClick={() => setCompose(!compose)}>{compose ? "Close" : "Compose email"}</button>
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }} role="status">{msg}</div>}

      {compose && (
        <div className="adm-card" style={{ marginBottom: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <select className="adm-select" value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value as "custom" | "ambassador", target: e.target.value === "ambassador" ? "ambassadors" : form.target })} aria-label="Template">
              <option value="custom">Custom message</option><option value="ambassador">Ambassador code & link</option>
            </select>
            <select className="adm-select" value={form.target} onChange={set("target")} aria-label="Send to">
              {TARGETS.filter(([k]) => form.template === "custom" || k === "single" || k === "ambassadors").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {form.target === "cohort" && <select className="adm-select" value={form.cohortId} onChange={set("cohortId")} aria-label="Cohort"><option value="">Choose cohort</option>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
            {form.target === "single" && <><input className="adm-input" type="email" placeholder="Recipient email" value={form.to} onChange={set("to")} /><input className="adm-input" placeholder="Recipient name (optional)" value={form.name} onChange={set("name")} /></>}
          </div>
          {form.template === "custom" && <>
            <input className="adm-input" placeholder="Subject" value={form.subject} onChange={set("subject")} />
            <input className="adm-input" placeholder="Heading, e.g. Hi {{name}}" value={form.heading} onChange={set("heading")} />
            <textarea className="adm-input" rows={7} placeholder="Message. Use {{name}} for the person's first name. Leave a blank line between paragraphs." value={form.body} onChange={set("body")} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="adm-input" placeholder="Button label (optional)" value={form.ctaLabel} onChange={set("ctaLabel")} />
              <input className="adm-input" placeholder="Button link https://… (optional)" value={form.ctaUrl} onChange={set("ctaUrl")} />
            </div>
          </>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="adm-btn ghost" type="button" onClick={preview}>Preview</button>
            <button className="adm-btn green" type="button" disabled={busy} onClick={send}>{busy ? "Sending… please keep this page open" : "Send"}</button>
          </div>
        </div>
      )}

      <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }}><b>{stats.total}</b> emails logged · <b style={{ color: stats.failed ? "#b91c1c" : undefined }}>{stats.failed}</b> failed</div>
      <FilterToolbar search={s} onSearch={setS} placeholder="Search recipient or subject" from={from} to={to} onFrom={setFrom} onTo={setTo} active={!!(s || type || status || from || to)} onReset={() => { setS(""); setType(""); setStatus(""); setFrom(""); setTo(""); }}>
        <select className="adm-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type"><option value="">All types</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="bulk">Bulk sends</option></select>
        <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">Any status</option><option value="sent">Sent</option><option value="failed">Failed</option></select>
      </FilterToolbar>
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : rows.length === 0 ? <p className="adm-empty">No emails yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Date</th><th>To</th><th>Subject</th><th>Type</th><th>Status</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td>{r.to_email}</td><td>{r.subject}</td><td>{typeLabel(r.type)}{r.mode === "test" ? " · test" : ""}</td>
                <td><span className={`adm-pill ${r.status === "sent" ? "paid" : "failed"}`} title={r.error ?? ""}>{r.status}</span></td>
                <td className="num" style={{ whiteSpace: "nowrap" }}>
                  <button className="adm-btn ghost" style={{ padding: "4px 10px" }} onClick={() => open(r.id)}>View</button>{" "}
                  <button className="adm-btn ghost" style={{ padding: "4px 10px" }} disabled={busy} onClick={() => resend(r.id)}>Resend</button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>

      {view && (
        <div role="dialog" aria-modal="true" onClick={() => setView(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,10,40,.55)", zIndex: 50, display: "grid", placeItems: "center", padding: 16 }}>
          <div className="adm-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(680px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
              <div><b>{view.subject}</b>{view.to && <div style={{ fontSize: 13, color: "#6b6280" }}>To {view.to}</div>}</div>
              <div style={{ display: "flex", gap: 8 }}>
                {view.id && <button className="adm-btn" disabled={busy} onClick={() => resend(view.id!)}>Resend</button>}
                <button className="adm-btn ghost" onClick={() => setView(null)}>Close</button>
              </div>
            </div>
            <iframe title="Email preview" sandbox="" srcDoc={view.html} style={{ border: "1px solid #ece6f8", borderRadius: 12, width: "100%", height: "65vh", background: "#fff" }} />
          </div>
        </div>
      )}
    </>
  );
}
