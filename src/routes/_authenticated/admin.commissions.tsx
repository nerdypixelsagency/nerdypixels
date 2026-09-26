import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getCommissions, recordPayout, setCommissionRate } from "@/lib/admin-tools.functions";
import { naira } from "@/components/admin/data";

export const Route = createFileRoute("/_authenticated/admin/commissions")({ component: Commissions });

function Commissions() {
  const fn = useServerFn(getCommissions);
  const payFn = useServerFn(recordPayout);
  const rateFn = useServerFn(setCommissionRate);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["commissions"], queryFn: () => fn() });
  const [rate, setRate] = useState("");
  const [msg, setMsg] = useState("");

  async function payOut(code: string, owed: number) {
    const v = prompt(`Amount paid out to ${code} (₦)`, String(owed));
    if (!v) return;
    const amount = Math.round(Number(v));
    if (!amount || amount < 1) return setMsg("Enter a valid amount.");
    const note = prompt("Note (optional), e.g. bank transfer reference") ?? "";
    try { await payFn({ data: { code, amount, note } }); setMsg(`Recorded ${naira(amount)} paid to ${code}.`); qc.invalidateQueries({ queryKey: ["commissions"] }); }
    catch (e) { setMsg((e as Error).message); }
  }
  async function saveRate() {
    const n = Number(rate);
    if (!(n >= 0 && n <= 100)) return setMsg("Rate must be between 0 and 100.");
    try { await rateFn({ data: { rate: n } }); setRate(""); setMsg(`Commission rate set to ${n}%.`); qc.invalidateQueries({ queryKey: ["commissions"] }); }
    catch (e) { setMsg((e as Error).message); }
  }

  if (isLoading) return <p className="adm-empty">Loading…</p>;
  if (error || !data) return <p className="adm-empty">{(error as Error)?.message}</p>;
  const totalOwed = data.list.reduce((s, x) => s + x.owed, 0);

  return (
    <>
      <div className="adm-head"><h1>Referral commissions</h1>
        {data.role === "super_admin" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="adm-input" style={{ width: 110 }} type="number" inputMode="decimal" placeholder={`${data.rate}%`} value={rate} onChange={(e) => setRate(e.target.value)} aria-label="Commission rate" />
            <button className="adm-btn ghost" onClick={saveRate}>Set rate</button>
          </div>
        )}
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }} role="status">{msg}</div>}
      <div className="adm-card" style={{ marginBottom: 16 }}>
        <b>Commission rate: {data.rate}%</b> of paid sales · <b>Total owed: {naira(totalOwed)}</b>
      </div>
      <div className="adm-card">
        {data.list.length === 0 ? <p className="adm-empty">No paid sales with a referral code yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Code</th><th className="num">Paid sales</th><th className="num">Revenue</th><th className="num">Earned</th><th className="num">Paid out</th><th className="num">Owed</th><th></th></tr></thead>
            <tbody>{data.list.map((x) => (
              <tr key={x.code}><td><b>{x.code}</b></td><td className="num">{x.sales}</td><td className="num money">{naira(x.revenue)}</td><td className="num">{naira(x.earned)}</td><td className="num">{naira(x.paidOut)}</td>
                <td className="num money"><b>{naira(x.owed)}</b></td>
                <td><button className="adm-btn green" style={{ padding: "6px 12px" }} disabled={x.owed <= 0} onClick={() => payOut(x.code, x.owed)}>Mark paid out</button></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <div className="adm-card" style={{ marginTop: 16 }}><h2 style={{ fontSize: 16, marginTop: 0 }}>Payout history</h2>
        {data.payouts.length === 0 ? <p className="adm-empty">No payouts recorded yet</p> : (
          <table className="adm-table"><tbody>{data.payouts.map((p: { id: string; created_at: string; referral_code: string; amount: number; note: string | null }) => (
            <tr key={p.id}><td>{new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td><td><b>{p.referral_code}</b></td><td className="num money">{naira(p.amount)}</td><td>{p.note ?? ""}</td></tr>
          ))}</tbody></table>
        )}
      </div>
    </>
  );
}
