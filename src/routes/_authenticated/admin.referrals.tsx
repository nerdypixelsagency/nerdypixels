import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Fragment, useMemo, useState } from "react";
import { getEnrolments } from "@/lib/admin.functions";
import { listAmbassadors, saveAmbassador } from "@/lib/referrals.functions";
import { download, enrolmentsQuery, naira, toCsv } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/referrals")({ component: Referrals });

type Ambassador = { id: string; name: string; email: string | null; code: string; source: string; active: boolean };

const linkFor = (code: string) => `https://bootcamp.npdacademy.com/?ref=${code}`;

function Referrals() {
  const fn = useServerFn(getEnrolments);
  const ambFn = useServerFn(listAmbassadors);
  const saveFn = useServerFn(saveAmbassador);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(enrolmentsQuery(fn));
  const { data: ambassadors = [], isLoading: ambLoading } = useQuery({ queryKey: ["ambassadors"], queryFn: () => ambFn() });
  const [open, setOpen] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Ambassador | null>(null);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState("");

  const groups = useMemo(() => {
    const m: Record<string, { code: string; rows: NonNullable<typeof data>["rows"]; paid: number; revenue: number; students: Set<string> }> = {};
    (data?.rows ?? []).filter((r) => r.referral_code && r.kind !== "event").forEach((r) => {
      const k = r.referral_code!.toUpperCase();
      m[k] ??= { code: k, rows: [], paid: 0, revenue: 0, students: new Set() };
      m[k].rows.push(r);
      if (r.status === "paid") { m[k].paid++; m[k].revenue += r.amount; m[k].students.add(r.email); }
    });
    return Object.values(m).sort((a, b) => b.revenue - a.revenue);
  }, [data]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveFn({
        data: {
          id: edit?.id,
          name: String(fd.get("name") || ""),
          email: String(fd.get("email") || ""),
          code: String(fd.get("code") || ""),
          active: fd.get("active") === "on",
        },
      });
      setShowForm(false); setEdit(null); setMsg("Ambassador saved.");
      qc.invalidateQueries({ queryKey: ["ambassadors"] });
    } catch (err) { setMsg((err as Error).message); }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(linkFor(code)).then(() => { setCopied(code); setTimeout(() => setCopied(""), 1500); }).catch(() => {});
  }

  return (
    <>
      <div className="adm-head"><h1>Referrals</h1>
        <button className="adm-btn" onClick={() => { setEdit(null); setShowForm(!showForm); }}>{showForm ? "Close" : "Add ambassador"}</button>
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }} role="status">{msg}</div>}
      {showForm && (
        <form className="adm-card" onSubmit={submit} style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="adm-input" name="name" required placeholder="Full name" defaultValue={edit?.name ?? ""} />
          <input className="adm-input" name="email" type="email" placeholder="Email (optional)" defaultValue={edit?.email ?? ""} />
          <input className="adm-input" name="code" required placeholder="CODE-XXXX" defaultValue={edit?.code ?? ""} style={{ textTransform: "uppercase" }} />
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="active" defaultChecked={edit ? edit.active : true} /> Active</label>
          <button className="adm-btn green">{edit ? "Save changes" : "Add ambassador"}</button>
        </form>
      )}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Ambassadors</h2>
        <p style={{ margin: "0 0 12px", color: "#6b6280", fontSize: 13 }}>Everyone with a referral code. Shareable link: <b>bootcamp.npdacademy.com/?ref=CODE</b> — the code is remembered and pre-filled at checkout.</p>
        {ambLoading ? <p className="adm-empty">Loading…</p> : ambassadors.length === 0 ? <p className="adm-empty">No ambassadors yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Name</th><th>Email</th><th>Code</th><th>Link</th><th>Source</th><th>Status</th><th></th></tr></thead>
            <tbody>{(ambassadors as Ambassador[]).map((a) => (
              <tr key={a.id}>
                <td><b>{a.name}</b></td><td>{a.email ?? "—"}</td><td><b>{a.code}</b></td>
                <td><button className="adm-btn ghost" style={{ padding: "4px 10px" }} onClick={() => copy(a.code)}>{copied === a.code ? "Copied!" : "Copy link"}</button></td>
                <td>{a.source === "student" ? "Student" : "Imported"}</td>
                <td><span className={`adm-pill ${a.active ? "paid" : "failed"}`}>{a.active ? "Active" : "Off"}</span></td>
                <td className="num"><button className="adm-btn ghost" style={{ padding: "4px 10px" }} onClick={() => { setEdit(a); setShowForm(true); }}>Edit</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <div className="adm-card">
        <h2 style={{ fontSize: 16, marginTop: 0 }}>Code usage</h2>
        <p style={{ margin: "0 0 12px", color: "#6b6280", fontSize: 13 }}>Click a code to see who used it and export their payments.</p>
        {isLoading ? <p className="adm-empty">Loading…</p> : groups.length === 0 ? <p className="adm-empty">No referral codes used yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Code</th><th className="num">Checkouts</th><th className="num">Paid students</th><th className="num">Paid payments</th><th className="num">Revenue</th><th></th></tr></thead>
            <tbody>{groups.map((g) => (
              <Fragment key={g.code}>
                <tr style={{ cursor: "pointer" }} onClick={() => setOpen(open === g.code ? null : g.code)}>
                  <td><b>{g.code}</b></td><td className="num">{g.rows.length}</td><td className="num">{g.students.size}</td><td className="num">{g.paid}</td><td className="num money">{naira(g.revenue)}</td>
                  <td className="num"><button className="adm-btn ghost" onClick={(e) => { e.stopPropagation(); download(`referral-${g.code}.csv`, toCsv(g.rows)); }}>CSV</button></td>
                </tr>
                {open === g.code && g.rows.map((r) => (
                  <tr key={r.id} style={{ background: "#faf8fd" }}>
                    <td style={{ paddingLeft: 28 }}>{r.name}</td><td colSpan={2}>{r.email}</td>
                    <td className="num">{r.kind === "instalment" ? r.instalment_month : r.plan}</td><td className="num money">{naira(r.amount)}</td><td><span className={`adm-pill ${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </Fragment>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
