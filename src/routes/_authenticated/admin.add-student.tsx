import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { addManualStudent } from "@/lib/admin-tools.functions";

export const Route = createFileRoute("/_authenticated/admin/add-student")({ component: AddStudent });

function AddStudent() {
  const fn = useServerFn(addManualStudent);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", email: "", phone: "", plan: "early" as "early" | "monthly", amount: "60000", paymentMethod: "Bank transfer", referralCode: "", paid: true, sendEmail: true });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF((p) => ({ ...p, [k]: v, ...(k === "plan" ? { amount: v === "early" ? "60000" : "40000" } : {}) }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Enter the student's full name and a valid email.");
    setBusy(true);
    try {
      const r = await fn({ data: { ...f, amount: Number(f.amount) || 0 } });
      qc.invalidateQueries({ queryKey: ["admin-enrolments"] });
      nav({ to: "/admin/enrolment/$id", params: { id: r.id } });
    } catch (e2) { setErr((e2 as Error).message); setBusy(false); }
  }

  const lbl = { display: "grid", gap: 6, fontSize: 14, fontWeight: 600 } as const;
  return (
    <>
      <div className="adm-head"><div><Link to="/admin/enrolments" style={{ color: "#6420c9", fontWeight: 600, fontSize: 14 }}>← All enrolments</Link><h1>Add a student manually</h1></div></div>
      <form className="adm-card" onSubmit={submit} style={{ display: "grid", gap: 14, maxWidth: 620 }} noValidate>
        <p style={{ margin: 0, color: "#574e68", fontSize: 14 }}>For students who paid offline, by bank transfer or in cash. The record is marked as "manual".</p>
        <label style={lbl}>Full name<input className="adm-input" value={f.name} onChange={set("name")} autoComplete="off" required /></label>
        <label style={lbl}>Email<input className="adm-input" type="email" inputMode="email" value={f.email} onChange={set("email")} required /></label>
        <label style={lbl}>WhatsApp number<input className="adm-input" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} /></label>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
          <label style={lbl}>Plan<select className="adm-select" value={f.plan} onChange={set("plan")}><option value="early">Early bird (paid once)</option><option value="monthly">Monthly plan</option></select></label>
          <label style={lbl}>Amount received (₦)<input className="adm-input" type="number" inputMode="numeric" min={0} value={f.amount} onChange={set("amount")} /></label>
          <label style={lbl}>Payment method<input className="adm-input" value={f.paymentMethod} onChange={set("paymentMethod")} /></label>
          <label style={lbl}>Referral code (optional)<input className="adm-input" value={f.referralCode} onChange={set("referralCode")} /></label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={f.paid} onChange={set("paid")} /> Payment already received</label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={f.sendEmail} disabled={!f.paid} onChange={set("sendEmail")} /> Send the welcome email now</label>
        {err && <p role="alert" style={{ background: "#fdecea", color: "#a12a22", padding: "10px 12px", borderRadius: 10, margin: 0 }}>{err}</p>}
        <div><button className="adm-btn green" type="submit" disabled={busy}>{busy ? "Saving…" : "Add student"}</button></div>
      </form>
    </>
  );
}
