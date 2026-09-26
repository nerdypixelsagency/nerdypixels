import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getEnrolments } from "@/lib/admin.functions";
import { download, enrolmentsQuery, naira, toCsv } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/referrals")({ component: Referrals });

function Referrals() {
  const fn = useServerFn(getEnrolments);
  const { data, isLoading } = useQuery(enrolmentsQuery(fn));
  const [open, setOpen] = useState<string | null>(null);

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

  return (
    <>
      <div className="adm-head"><h1>Referrals</h1></div>
      <div className="adm-card">
        <p style={{ margin: 0, color: "#6b6280", fontSize: 13 }}>Each code with its sign-ups and money collected. Click a code to see who used it and export their payments for commission.</p>
        {isLoading ? <p className="adm-empty">Loading…</p> : groups.length === 0 ? <p className="adm-empty">No referral codes used yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Code</th><th className="num">Checkouts</th><th className="num">Paid students</th><th className="num">Paid payments</th><th className="num">Revenue</th><th></th></tr></thead>
            <tbody>{groups.map((g) => (
              <>
                <tr key={g.code} style={{ cursor: "pointer" }} onClick={() => setOpen(open === g.code ? null : g.code)}>
                  <td><b>{g.code}</b></td><td className="num">{g.rows.length}</td><td className="num">{g.students.size}</td><td className="num">{g.paid}</td><td className="num money">{naira(g.revenue)}</td>
                  <td className="num"><button className="adm-btn ghost" onClick={(e) => { e.stopPropagation(); download(`referral-${g.code}.csv`, toCsv(g.rows)); }}>CSV</button></td>
                </tr>
                {open === g.code && g.rows.map((r) => (
                  <tr key={r.id} style={{ background: "#faf8fd" }}>
                    <td style={{ paddingLeft: 28 }}>{r.name}</td><td colSpan={2}>{r.email}</td>
                    <td className="num">{r.kind === "instalment" ? r.instalment_month : r.plan}</td><td className="num money">{naira(r.amount)}</td><td><span className={`adm-pill ${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
