import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCohorts, saveCohort } from "@/lib/referrals.functions";

export const Route = createFileRoute("/_authenticated/admin/cohorts")({ component: Cohorts });

type Cohort = { id: string; name: string; course: string; start_date: string | null; end_date: string | null; whatsapp_link: string | null; status: string; students: number };

function Cohorts() {
  const listFn = useServerFn(listCohorts);
  const saveFn = useServerFn(saveCohort);
  const qc = useQueryClient();
  const { data: cohorts = [], isLoading } = useQuery({ queryKey: ["cohorts"], queryFn: () => listFn() });
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<Cohort | null>(null);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveFn({
        data: {
          id: edit?.id,
          name: String(fd.get("name") || ""),
          course: String(fd.get("course") || ""),
          startDate: String(fd.get("startDate") || ""),
          endDate: String(fd.get("endDate") || ""),
          whatsappLink: String(fd.get("whatsappLink") || ""),
          status: fd.get("status") === "closed" ? "closed" : "open",
        },
      });
      setShowForm(false); setEdit(null); setMsg("Cohort saved.");
      qc.invalidateQueries({ queryKey: ["cohorts"] });
    } catch (err) { setMsg((err as Error).message); }
  }

  return (
    <>
      <div className="adm-head"><h1>Cohorts</h1>
        <button className="adm-btn" onClick={() => { setEdit(null); setShowForm(!showForm); }}>{showForm ? "Close" : "New cohort"}</button>
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }} role="status">{msg}</div>}
      <div className="adm-card" style={{ marginBottom: 16, fontSize: 13, color: "#6b6280" }}>
        New enrolments are tagged to the <b>open</b> cohort automatically, and the welcome email uses its start date and WhatsApp link. Keep only one cohort open at a time.
      </div>
      {showForm && (
        <form className="adm-card" onSubmit={submit} style={{ marginBottom: 16, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <input className="adm-input" name="name" required placeholder="Cohort name, e.g. November 2026" defaultValue={edit?.name ?? ""} />
          <input className="adm-input" name="course" required placeholder="Course" defaultValue={edit?.course ?? "Digital Marketing Bootcamp"} />
          <input className="adm-input" name="startDate" placeholder="Start date, e.g. Thursday 5 November 2026" defaultValue={edit?.start_date ?? ""} />
          <input className="adm-input" name="endDate" placeholder="End date (optional)" defaultValue={edit?.end_date ?? ""} />
          <input className="adm-input" name="whatsappLink" placeholder="WhatsApp group link" defaultValue={edit?.whatsapp_link ?? ""} style={{ gridColumn: "1 / -1" }} />
          <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
            <select className="adm-input" name="status" defaultValue={edit?.status ?? "open"} style={{ width: "auto" }}>
              <option value="open">Open</option><option value="closed">Closed</option>
            </select>
          </label>
          <button className="adm-btn green" style={{ justifySelf: "start" }}>{edit ? "Save changes" : "Create cohort"}</button>
        </form>
      )}
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : cohorts.length === 0 ? <p className="adm-empty">No cohorts yet — create the first one.</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Cohort</th><th>Course</th><th>Starts</th><th>Ends</th><th className="num">Students</th><th>Status</th><th></th></tr></thead>
            <tbody>{(cohorts as Cohort[]).map((c) => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td><td>{c.course}</td><td>{c.start_date ?? "—"}</td><td>{c.end_date ?? "—"}</td>
                <td className="num">{c.students}</td>
                <td><span className={`adm-pill ${c.status === "open" ? "paid" : ""}`}>{c.status}</span></td>
                <td className="num"><button className="adm-btn ghost" style={{ padding: "4px 10px" }} onClick={() => { setEdit(c); setShowForm(true); }}>Edit</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
