import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { listCoupons, saveCoupon, deleteCoupon, type CouponAdminRow } from "@/lib/coupons.functions";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  head: () => ({ meta: [{ title: "Coupons & paylinks | Nerdy Pixels Admin" }, { name: "robots", content: "noindex" }] }),
  component: Coupons,
});

type Draft = {
  id?: string; code: string; label: string; badge: string; kind: "fixed" | "percent";
  priceNgn: string; priceUsd: string; percent: string; active: boolean; expiresAt: string; startsAt: string; maxUses: string;
};
const blank: Draft = { code: "", label: "", badge: "80% OFF", kind: "fixed", priceNgn: "25000", priceUsd: "25", percent: "", active: true, expiresAt: "", startsAt: "", maxUses: "" };

// <input type=datetime-local> <-> ISO, in the admin's local timezone (WAT for the team).
const toLocal = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d.getTime())) return ""; const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function timeLeft(iso: string | null): string {
  if (!iso) return "no limit";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${x}s` : `${m}m ${x}s`;
}
function Countdown({ iso }: { iso: string | null }) {
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const left = timeLeft(iso);
  const expired = left === "expired";
  return <b style={{ color: expired ? "#C62B2B" : "#1DAA61" }}>{expired ? "Expired" : `${left} left`}</b>;
}

function Coupons() {
  const listFn = useServerFn(listCoupons);
  const saveFn = useServerFn(saveCoupon);
  const delFn = useServerFn(deleteCoupon);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["coupons"], queryFn: () => listFn() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [qr, setQr] = useState<{ code: string; url: string } | null>(null);
  const [copied, setCopied] = useState("");

  const origin = typeof window !== "undefined" ? window.location.origin : "https://bootcamp.npdacademy.com";
  const paylink = (code: string) => `${origin}/checkout?plan=early&coupon=${encodeURIComponent(code)}`;
  const rows = data?.rows ?? [];

  function edit(r?: CouponAdminRow) {
    setErr(""); setMsg("");
    if (!r) return setDraft({ ...blank });
    setDraft({ id: r.id, code: r.code, label: r.label, badge: r.badge, kind: r.kind, priceNgn: r.price_ngn?.toString() ?? "", priceUsd: r.price_usd?.toString() ?? "", percent: r.percent?.toString() ?? "", active: r.active, expiresAt: toLocal(r.expires_at), startsAt: toLocal(r.starts_at), maxUses: r.max_uses?.toString() ?? "" });
  }
  async function submit() {
    if (!draft) return;
    setBusy(true); setErr("");
    try {
      await saveFn({ data: {
        id: draft.id, code: draft.code.trim(), label: draft.label.trim(), badge: draft.badge.trim(), kind: draft.kind,
        priceNgn: draft.priceNgn ? Math.round(Number(draft.priceNgn)) : null,
        priceUsd: draft.priceUsd ? Number(draft.priceUsd) : null,
        percent: draft.percent ? Number(draft.percent) : null,
        active: draft.active, startsAt: fromLocal(draft.startsAt), expiresAt: fromLocal(draft.expiresAt),
        maxUses: draft.maxUses ? Math.round(Number(draft.maxUses)) : null,
      } });
      qc.invalidateQueries({ queryKey: ["coupons"] }); setDraft(null); setMsg("Saved.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function toggleActive(r: CouponAdminRow) {
    setBusy(true);
    try { await saveFn({ data: { id: r.id, code: r.code, label: r.label, badge: r.badge, kind: r.kind, priceNgn: r.price_ngn, priceUsd: r.price_usd, percent: r.percent, active: !r.active, startsAt: r.starts_at, expiresAt: r.expires_at, maxUses: r.max_uses } }); qc.invalidateQueries({ queryKey: ["coupons"] }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function remove(r: CouponAdminRow) {
    if (!confirm(`Delete coupon ${r.code}? Its paylink will stop working.`)) return;
    setBusy(true);
    try { await delFn({ data: { id: r.id } }); qc.invalidateQueries({ queryKey: ["coupons"] }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function showQr(code: string) {
    try { const QR = await import("qrcode"); const url = await QR.toDataURL(paylink(code), { width: 480, margin: 2, color: { dark: "#14111F", light: "#ffffff" } }); setQr({ code, url }); }
    catch { setErr("Couldn't generate the QR code."); }
  }
  async function copy(code: string) { try { await navigator.clipboard.writeText(paylink(code)); setCopied(code); setTimeout(() => setCopied(""), 1500); } catch { /* ignore */ } }

  const priceOf = (r: CouponAdminRow) => r.kind === "percent" ? `${r.percent ?? 0}% off` : `₦${(r.price_ngn ?? 0).toLocaleString()} / $${r.price_usd ?? 0}`;
  const status = (r: CouponAdminRow) => !r.active ? "Off" : r.expires_at && new Date(r.expires_at).getTime() < Date.now() ? "Expired" : r.max_uses != null && r.uses >= r.max_uses ? "Maxed" : "Live";
  const randomCode = () => "NPD" + Math.random().toString(36).slice(2, 7).toUpperCase();

  return (
    <>
      <div className="adm-head"><h1>Coupons &amp; paylinks</h1>
        <button className="adm-btn" onClick={() => edit()}>+ New coupon</button>
      </div>
      <p className="adm-sub" style={{ marginTop: -6 }}>Each coupon makes a shareable payment link (and QR) for the bootcamp at a discounted, outright price. The charged amount is enforced on the server — it can't be tampered with in the browser.</p>
      {msg && <div className="adm-card" style={{ background: "#E8FBF0", color: "#0B6B3A", marginBottom: 12 }}>{msg}</div>}
      {err && <div className="adm-card" style={{ background: "#FDECEC", color: "#A42121", marginBottom: 12 }}>{err}</div>}

      {isLoading ? <div className="adm-card">Loading…</div> : error ? <div className="adm-card">Couldn't load coupons.</div> : (
        <div className="adm-card" style={{ overflowX: "auto" }}>
          <table className="adm-table">
            <thead><tr><th>Code</th><th>Price</th><th>Status</th><th>Expires</th><th>Uses</th><th>Paylink</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} style={{ color: "#8A849C" }}>No coupons yet. Create one for your event.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.code}</b>{r.badge && <span className="adm-chip" style={{ marginLeft: 8, background: "#F3ECFE", color: "#7D2AE8" }}>{r.badge}</span>}<div className="adm-muted" style={{ fontSize: 12 }}>{r.label}</div></td>
                  <td>{priceOf(r)}</td>
                  <td><span className="adm-chip" style={{ background: status(r) === "Live" ? "#E8FBF0" : "#FFF3DA", color: status(r) === "Live" ? "#0B6B3A" : "#9A6B00" }}>{status(r)}</span></td>
                  <td style={{ fontSize: 13 }}>{r.expires_at ? <Countdown iso={r.expires_at} /> : <span className="adm-muted">no limit</span>}</td>
                  <td>{r.uses}{r.max_uses != null ? ` / ${r.max_uses}` : ""}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="adm-btn ghost sm" onClick={() => copy(r.code)}>{copied === r.code ? "Copied ✓" : "Copy link"}</button>
                      <button className="adm-btn ghost sm" onClick={() => showQr(r.code)}>QR</button>
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="adm-btn ghost sm" onClick={() => edit(r)}>Edit</button>{" "}
                    <button className="adm-btn ghost sm" onClick={() => toggleActive(r)} disabled={busy}>{r.active ? "Turn off" : "Turn on"}</button>{" "}
                    <button className="adm-btn ghost sm" onClick={() => remove(r)} disabled={busy} style={{ color: "#C62B2B" }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {draft && (
        <div className="adm-modal-bg" onClick={() => setDraft(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h2>{draft.id ? "Edit coupon" : "New coupon"}</h2>
            <div className="adm-grid2">
              <label>Code<div style={{ display: "flex", gap: 6 }}><input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="NERDY80" />{!draft.id && <button type="button" className="adm-btn ghost sm" onClick={() => setDraft({ ...draft, code: randomCode() })}>Generate</button>}</div></label>
              <label>Badge shown to buyers<input value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} placeholder="80% OFF" /></label>
            </div>
            <label>Internal name<input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Demo Day event" /></label>
            <label>Discount type
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as "fixed" | "percent" })}>
                <option value="fixed">Flat price (set the exact charge)</option>
                <option value="percent">Percent off the full price</option>
              </select>
            </label>
            {draft.kind === "fixed" ? (
              <div className="adm-grid2">
                <label>Price in Naira (₦)<input type="number" value={draft.priceNgn} onChange={(e) => setDraft({ ...draft, priceNgn: e.target.value })} placeholder="25000" /></label>
                <label>Price in Dollars ($)<input type="number" step="0.01" value={draft.priceUsd} onChange={(e) => setDraft({ ...draft, priceUsd: e.target.value })} placeholder="25" /></label>
              </div>
            ) : (
              <label>Percent off<input type="number" value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: e.target.value })} placeholder="80" /></label>
            )}
            <div className="adm-grid2">
              <label>Starts (optional)<input type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} /></label>
              <label>Expires<input type="datetime-local" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} /></label>
            </div>
            <div className="adm-grid2">
              <label>Max uses (optional)<input type="number" value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })} placeholder="No limit" /></label>
              <label className="adm-check" style={{ alignSelf: "end" }}><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
            </div>
            <p className="adm-muted" style={{ fontSize: 12 }}>Coupons apply to the outright (paid-in-full) bootcamp only — never instalments.</p>
            {err && <div style={{ color: "#C62B2B", fontSize: 13 }}>{err}</div>}
            <div className="adm-row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button className="adm-btn ghost" onClick={() => setDraft(null)}>Cancel</button>
              <button className="adm-btn" onClick={submit} disabled={busy || !draft.code.trim()}>{busy ? "Saving…" : "Save coupon"}</button>
            </div>
          </div>
        </div>
      )}

      {qr && (
        <div className="adm-modal-bg" onClick={() => setQr(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, textAlign: "center" }}>
            <h2>{qr.code}</h2>
            <img src={qr.url} alt={`QR for ${qr.code}`} style={{ width: 280, height: 280, maxWidth: "100%" }} />
            <p className="adm-muted" style={{ fontSize: 12, wordBreak: "break-all" }}>{paylink(qr.code)}</p>
            <div className="adm-row" style={{ justifyContent: "center", gap: 8 }}>
              <a className="adm-btn" href={qr.url} download={`coupon-${qr.code}.png`}>Download PNG</a>
              <button className="adm-btn ghost" onClick={() => setQr(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
