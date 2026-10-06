import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getLeadsWithStatus, sendLeadFollowups } from "@/lib/emails.functions";
import { download } from "@/components/admin/data";
import { FilterToolbar } from "@/components/admin/FilterToolbar";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({ meta: [{ title: "Leads & submissions | Nerdy Pixels Admin" }, { name: "robots", content: "noindex" }] }),
  component: Leads,
});

const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const CAT: Record<string, string> = { hero_lead: "Hero lead form", free_event: "Free event", student_profile: "Student profile", contact: "Contact" };
const PAY: Record<string, { label: string; cls: string }> = {
  not_paid: { label: "Not paid", cls: "failed" },
  checkout_started: { label: "Checkout started", cls: "pending" },
  paid: { label: "Paid", cls: "paid" },
};

function Leads() {
  const fn = useServerFn(getLeadsWithStatus);
  const follow = useServerFn(sendLeadFollowups);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-leads"], queryFn: () => fn() });
  const [s, setS] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("");
  const [pay, setPay] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const rows = useMemo(() => {
    const t = s.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) =>
      (!from || r.created_at.slice(0, 10) >= from) && (!to || r.created_at.slice(0, 10) <= to) &&
      (!cat || r.category === cat) &&
      (!pay || (pay === "unpaid" ? r.pay_status !== "paid" : r.pay_status === pay)) &&
      (!t || [r.first_name, r.last_name, r.email, r.phone, r.country, r.source].some((v) => v?.toLowerCase().includes(t))),
    );
  }, [data, s, from, to, cat, pay]);
  const unpaid = rows.filter((r) => r.pay_status !== "paid");

  async function run(ids: string[] | undefined, key: string) {
    if (!ids && !confirm(`Send a follow-up email to ${unpaid.length} unpaid lead(s)?`)) return;
    setBusy(key); setMsg("");
    try {
      const r = await follow({ data: { ids } });
      setMsg(`Sent ${r.sent} follow-up(s).${r.failed.length ? ` Failed: ${r.failed.join(", ")}` : ""}`);
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    } catch (e) { setMsg((e as Error).message); }
    setBusy("");
  }

  function exportCsv() {
    const head = ["Date", "Category", "First name", "Last name", "Email", "WhatsApp", "Country", "Heard about us", "Payment", "Follow-ups"];
    const body = rows.map((r) => [r.created_at, CAT[r.category] ?? r.category, r.first_name, r.last_name, r.email, r.phone, r.country, r.source, PAY[r.pay_status]?.label, r.followup_count].map(q).join(","));
    download("leads.csv", [head.join(","), ...body].join("\n"));
  }

  return (
    <>
      <div className="adm-head"><h1>Leads & submissions</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="adm-btn" disabled={!!busy || !unpaid.length} onClick={() => run(unpaid.map((r) => r.id), "all")}>{busy === "all" ? "Sending…" : `Follow up unpaid (${unpaid.length})`}</button>
          <button className="adm-btn green" onClick={exportCsv}>Export CSV ({rows.length})</button>
        </div>
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }} role="status">{msg}</div>}
      <FilterToolbar search={s} onSearch={setS} placeholder="Search name, email, phone, country, source" from={from} to={to} onFrom={setFrom} onTo={setTo} active={!!(s || from || to || cat || pay)} onReset={() => { setS(""); setFrom(""); setTo(""); setCat(""); setPay(""); }}>
        <select className="adm-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All forms</option>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="adm-select" value={pay} onChange={(e) => setPay(e.target.value)} aria-label="Payment"><option value="">Any payment</option><option value="unpaid">Not paid yet</option><option value="not_paid">Never checked out</option><option value="checkout_started">Checkout started</option><option value="paid">Paid</option></select>
      </FilterToolbar>
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : rows.length === 0 ? <p className="adm-empty">No leads yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Date</th><th>Form</th><th>Name</th><th>Email</th><th>WhatsApp</th><th>Payment</th><th>Follow-ups</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td>{CAT[r.category] ?? r.category}</td>
                <td>{r.first_name} {r.last_name}</td>
                <td>{r.email}</td>
                <td>{r.phone && r.phone !== "-" ? <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{r.phone}</a> : "—"}</td>
                <td><span className={`adm-pill ${PAY[r.pay_status]?.cls}`}>{PAY[r.pay_status]?.label}</span></td>
                <td>{r.followup_count ? `${r.followup_count} · ${new Date(r.last_followup_at!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "—"}</td>
                <td className="num">{r.pay_status !== "paid" && <button className="adm-btn ghost" style={{ padding: "4px 10px" }} disabled={!!busy} onClick={() => run([r.id], r.id)}>{busy === r.id ? "Sending…" : "Send follow-up"}</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
