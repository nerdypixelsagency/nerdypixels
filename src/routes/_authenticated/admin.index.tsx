import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getEnrolments } from "@/lib/admin.functions";
import { enrolmentsQuery, initials, naira, PERSONAS } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

const COLORS = ["#7d2ae8", "#25d366", "#b28cf5", "#2e0b63", "#8fe3b0"];

function Dashboard() {
  const fn = useServerFn(getEnrolments);
  const { data, isLoading, error } = useQuery(enrolmentsQuery(fn));
  const rows = data?.rows ?? [];

  const s = useMemo(() => {
    const paid = rows.filter((r) => r.status === "paid");
    const enrol = rows.filter((r) => r.kind === "enrolment");
    const days: Record<string, { day: string; revenue: number; count: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      days[d] = { day: d.slice(5), revenue: 0, count: 0 };
    }
    paid.forEach((r) => {
      const d = (r.paid_at ?? r.created_at).slice(0, 10);
      const b = days[d]; if (b) { b.revenue += r.amount; b.count += 1; }
    });
    const persona: Record<string, number> = {};
    enrol.forEach((r) => { const k = PERSONAS[r.persona ?? ""] ?? "Not given"; persona[k] = (persona[k] ?? 0) + 1; });
    const refs: Record<string, { code: string; n: number; paid: number; revenue: number }> = {};
    rows.filter((r) => r.referral_code && r.kind !== "event").forEach((r) => {
      const k = r.referral_code!.toUpperCase();
      refs[k] ??= { code: k, n: 0, paid: 0, revenue: 0 };
      refs[k].n++;
      if (r.status === "paid") { refs[k].paid++; refs[k].revenue += r.amount; }
    });
    const plans = [
      { name: "Early bird", value: enrol.filter((r) => r.plan === "early" && r.status === "paid").length },
      { name: "Monthly", value: enrol.filter((r) => r.plan === "monthly" && r.status === "paid").length },
    ];
    return {
      revenue: paid.reduce((a, r) => a + r.amount, 0),
      students: enrol.filter((r) => r.status === "paid").length,
      pending: enrol.filter((r) => r.status === "pending").length,
      early: plans[0]!.value,
      events: rows.filter((r) => r.kind === "event").length,
      series: Object.values(days),
      persona: Object.entries(persona).map(([name, value]) => ({ name, value })),
      refs: Object.values(refs).sort((a, b) => b.revenue - a.revenue || b.n - a.n).slice(0, 6),
      plans,
      recent: rows.filter((r) => r.kind !== "event").slice(0, 6),
    };
  }, [rows]);

  if (isLoading) return <p className="adm-empty">Loading…</p>;
  if (error) return <p className="adm-empty">Couldn't load data: {(error as Error).message}</p>;

  return (
    <>
      <div className="adm-head"><h1>Dashboard</h1><Link to="/admin/enrolments" className="adm-btn" style={{ textDecoration: "none" }}>View all enrolments</Link></div>
      <div className="adm-grid adm-g4">
        <Stat title="Revenue" sub="All paid" value={naira(s.revenue)} series={s.series.map((d) => d.revenue)} />
        <Stat title="Paid students" sub="Enrolments" value={String(s.students)} series={s.series.map((d) => d.count)} />
        <Stat title="Early bird seats" sub="Paid in full" value={String(s.early)} pill={`${s.pending} pending`} />
        <Stat title="Free event" sub="Registrations" value={String(s.events)} />
      </div>

      <div className="adm-grid adm-g3-1" style={{ marginTop: 20 }}>
        <div className="adm-card">
          <h3>Revenue, last 30 days</h3>
          <div className="adm-big">{naira(s.series.reduce((a, d) => a + d.revenue, 0))}</div>
          <div style={{ height: 240, marginTop: 10 }}>
            <ResponsiveContainer>
              <AreaChart data={s.series}>
                <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7d2ae8" stopOpacity={0.25} /><stop offset="1" stopColor="#7d2ae8" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#ebe6f3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b6280" }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "#6b6280" }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `₦${v / 1000}k` : `₦${v}`)} width={50} />
                <Tooltip formatter={(v: number) => naira(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#7d2ae8" strokeWidth={2} fill="url(#rv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="adm-card">
          <h3>Who is enrolling</h3>
          {s.persona.length === 0 ? <p className="adm-empty">No enrolments yet</p> : (
            <>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <PieChart><Pie data={s.persona} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>{s.persona.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="adm-legend">{s.persona.map((p, i) => <span key={p.name}><i style={{ background: COLORS[i % COLORS.length] }} />{p.name} ({p.value})</span>)}</div>
            </>
          )}
        </div>
      </div>

      <div className="adm-grid adm-g2" style={{ marginTop: 20 }}>
        <div className="adm-card">
          <h3>Top referral codes</h3>
          {s.refs.length === 0 ? <p className="adm-empty">No referral codes used yet</p> : (
            <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Code</th><th className="num">Sign-ups</th><th className="num">Paid</th><th className="num">Revenue</th></tr></thead>
              <tbody>{s.refs.map((r) => <tr key={r.code}><td><b>{r.code}</b></td><td className="num">{r.n}</td><td className="num">{r.paid}</td><td className="num money">{naira(r.revenue)}</td></tr>)}</tbody></table></div>
          )}
        </div>
        <div className="adm-card">
          <h3>Plans sold</h3>
          <div style={{ height: 220, marginTop: 10 }}>
            <ResponsiveContainer>
              <BarChart data={s.plans}><CartesianGrid stroke="#ebe6f3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} /><Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{s.plans.map((_, i) => <Cell key={i} fill={i ? "#25d366" : "#7d2ae8"} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="adm-card" style={{ marginTop: 20 }}>
        <h3>Latest payments</h3>
        {s.recent.length === 0 ? <p className="adm-empty">Nothing yet. New checkouts will appear here.</p> : (
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Type</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>{s.recent.map((r) => (
              <tr key={r.id}><td><span style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="adm-avatar">{initials(r.name)}</span>{r.name}</span></td><td>{r.email}</td>
                <td>{r.kind === "instalment" ? `${r.instalment_month} instalment` : r.plan === "early" ? "Early bird" : "Monthly plan"}</td>
                <td className="num money">{naira(r.amount)}</td><td><span className={`adm-pill ${r.status}`}>{r.status}</span></td></tr>
            ))}</tbody></table></div>
        )}
      </div>
    </>
  );
}

function Stat({ title, sub, value, series, pill }: { title: string; sub: string; value: string; series?: number[]; pill?: string }) {
  return (
    <div className="adm-card">
      <h3>{title}</h3>
      <div className="sub">{sub}</div>
      <div className="adm-big">{value}{pill && <span className="adm-pill pending">{pill}</span>}</div>
      {series && (
        <div style={{ height: 50, marginTop: 8 }}>
          <ResponsiveContainer>
            <AreaChart data={series.map((v, i) => ({ i, v }))}><Area type="monotone" dataKey="v" stroke="#7d2ae8" fill="#f3ecfe" strokeWidth={1.5} /></AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
