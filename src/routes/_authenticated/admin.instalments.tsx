import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getEnrolments } from "@/lib/admin.functions";
import { enrolmentsQuery } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/instalments")({ component: Instalments });

const MONTHS = ["November", "December", "January"] as const;
const DUE: Record<string, string> = { November: "At enrolment", December: "1 Dec 2026", January: "1 Jan 2027" };

function Instalments() {
  const fn = useServerFn(getEnrolments);
  const { data, isLoading } = useQuery(enrolmentsQuery(fn));

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
  const isDue = (mo: string) => (mo === "December" ? now >= new Date("2026-12-01") : mo === "January" ? now >= new Date("2027-01-01") : true);

  return (
    <>
      <div className="adm-head"><h1>Instalments</h1></div>
      <div className="adm-card">
        <p style={{ margin: 0, color: "#6b6280", fontSize: 13 }}>Students on the monthly plan (₦40,000 × 3). Green is paid, amber is due, grey is not yet due.</p>
        {isLoading ? <p className="adm-empty">Loading…</p> : students.length === 0 ? <p className="adm-empty">No monthly-plan students yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Student</th><th>WhatsApp</th>{MONTHS.map((m) => <th key={m}>{m}<br /><span style={{ fontWeight: 400, textTransform: "none" }}>{DUE[m]}</span></th>)}</tr></thead>
            <tbody>{students.map((s) => (
              <tr key={s.email}>
                <td><b>{s.name}</b><br /><span style={{ color: "#6b6280" }}>{s.email}</span></td>
                <td>{s.phone ?? "—"}</td>
                {MONTHS.map((m) => (
                  <td key={m}>{s.paid.has(m) ? <span className="adm-pill">paid</span> : isDue(m) ? <span className="adm-pill pending">due</span> : <span className="adm-pill registered" style={{ background: "#f1eff5", color: "#6b6280" }}>upcoming</span>}</td>
                ))}
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
