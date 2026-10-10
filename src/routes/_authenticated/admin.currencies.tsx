import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { deleteCurrency, listCurrencies, saveCurrency } from "@/lib/site-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/currencies")({
  head: () => ({ meta: [{ title: "Currencies & prices | Nerdy Pixels Academy Admin" }, { name: "robots", content: "noindex" }] }),
  component: Currencies,
});

type Cur = { code: string; label: string; symbol: string; deposit: number; early_total: number; monthly: number; chargeable: boolean; active: boolean; sort: number };
const blank: Cur = { code: "", label: "", symbol: "", deposit: 0, early_total: 0, monthly: 0, chargeable: false, active: true, sort: 100 };

function Currencies() {
  const listFn = useServerFn(listCurrencies), saveFn = useServerFn(saveCurrency), delFn = useServerFn(deleteCurrency);
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["currencies"], queryFn: () => listFn() });
  const [edit, setEdit] = useState<Cur | null>(null);
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!edit) return;
    try {
      await saveFn({ data: { code: edit.code, label: edit.label, symbol: edit.symbol, deposit: Number(edit.deposit), earlyTotal: Number(edit.early_total), monthly: Number(edit.monthly), chargeable: edit.chargeable, active: edit.active, sort: Number(edit.sort) } });
      setMsg(`${edit.code} saved.`); setEdit(null); qc.invalidateQueries({ queryKey: ["currencies"] });
    } catch (x) { setMsg((x as Error).message); }
  }
  const rows = data as Cur[];
  const num = (k: keyof Cur, label: string) => <label>{label}<input className="adm-input" type="number" min="0" step="0.01" required value={String(edit?.[k] ?? "")} onChange={(e) => setEdit({ ...edit!, [k]: e.target.value })} /></label>;
  return (
    <>
      <div className="adm-head"><h1>Currencies & prices</h1><button className="adm-btn" onClick={() => setEdit({ ...blank })}>Add currency</button></div>
      <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }}>
        <p style={{ margin: 0 }}>Naira prices come from the open cohort (Cohorts page). Here you set <b>fixed prices</b> for other currencies, so visitors see clean numbers that don't change with the exchange rate.</p>
        <p style={{ margin: "8px 0 0", color: "#6b6280", fontSize: 13 }}>Visitors in Nigeria see naira; everyone else sees US dollars. A country only defaults to its own currency once that currency is marked <b>Charge</b>. Only mark a currency Charge after Flutterwave confirms it's enabled on your account; otherwise payments in it will fail. Currencies without Charge can still be chosen to view prices, and those visitors pay in US dollars.</p>
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16 }} role="status">{msg}</div>}
      {edit && (
        <form className="adm-card adm-form-grid" style={{ marginBottom: 16 }} onSubmit={submit}>
          <h2 className="adm-section-title full">{rows.some((r) => r.code === edit.code) ? `Edit ${edit.code}` : "New currency"}</h2>
          <label>Code (3 letters)<input className="adm-input" required maxLength={3} pattern="[A-Za-z]{3}" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></label>
          <label>Name<input className="adm-input" required value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} placeholder="Ghana cedis" /></label>
          <label>Symbol<input className="adm-input" required maxLength={6} value={edit.symbol} onChange={(e) => setEdit({ ...edit, symbol: e.target.value })} placeholder="GH₵" /></label>
          {num("sort", "Order in the list")}
          {num("deposit", "Seat deposit")}
          {num("early_total", "Early-bird total")}
          {num("monthly", "Monthly instalment")}
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ flexDirection: "row", alignItems: "center" }}><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Show on the site</label>
            <label style={{ flexDirection: "row", alignItems: "center" }}><input type="checkbox" checked={edit.chargeable} onChange={(e) => setEdit({ ...edit, chargeable: e.target.checked })} /> Charge in this currency (enabled in Flutterwave)</label>
          </div>
          <p className="full" style={{ margin: 0, fontSize: 13, color: "#6b6280" }}>Balance on the early-bird plan = total minus deposit. First month on the monthly plan = monthly minus deposit.</p>
          <div className="full" style={{ display: "flex", gap: 8 }}><button className="adm-btn green">Save currency</button><button className="adm-btn ghost" type="button" onClick={() => setEdit(null)}>Cancel</button></div>
        </form>
      )}
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : rows.length === 0 ? <p className="adm-empty">No other currencies yet. Visitors see naira only.</p> : (
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Currency</th><th className="num">Deposit</th><th className="num">Early-bird total</th><th className="num">Monthly</th><th>On site</th><th>Charged in</th><th></th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.code}><td><b>{c.code}</b> <span className="sub">{c.label} ({c.symbol.trim()})</span></td>
                <td className="num">{c.symbol}{Number(c.deposit).toLocaleString()}</td><td className="num">{c.symbol}{Number(c.early_total).toLocaleString()}</td><td className="num">{c.symbol}{Number(c.monthly).toLocaleString()}</td>
                <td><span className={`adm-pill ${c.active ? "" : "registered"}`}>{c.active ? "shown" : "hidden"}</span></td>
                <td>{c.chargeable ? <span className="adm-pill">{c.code}</span> : <span className="adm-pill pending">US dollars</span>}</td>
                <td className="num" style={{ whiteSpace: "nowrap" }}><button className="adm-btn ghost" onClick={() => setEdit({ ...c })}>Edit</button>{" "}
                  <button className="adm-btn ghost" onClick={async () => { if (!confirm(`Delete ${c.code}?`)) return; try { await delFn({ data: { code: c.code } }); qc.invalidateQueries({ queryKey: ["currencies"] }); } catch (x) { setMsg((x as Error).message); } }}>Delete</button></td></tr>
            ))}</tbody></table></div>
        )}
      </div>
    </>
  );
}
