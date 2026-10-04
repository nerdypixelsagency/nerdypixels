import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { getMyRole, getPaymentModeFn, setPaymentMode } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Settings });

function Settings() {
  const modeFn = useServerFn(getPaymentModeFn), setModeFn = useServerFn(setPaymentMode), roleFn = useServerFn(getMyRole);
  const qc = useQueryClient();
  const { data: mode } = useQuery({ queryKey: ["pay-mode"], queryFn: () => modeFn() });
  const { data: role } = useQuery({ queryKey: ["admin-role"], queryFn: () => roleFn() });
  const isSuper = role?.role === "super_admin";
  async function change(next: "live" | "test") {
    if (!isSuper || next === mode?.mode) return;
    if (!confirm(next === "test" ? "Switch to TEST mode? Buyers will not be charged real money." : "Switch to LIVE mode? Buyers will be charged real money.")) return;
    await setModeFn({ data: { mode: next } }); await qc.invalidateQueries({ queryKey: ["pay-mode"] });
  }
  return <><div className="adm-head"><h1>Settings</h1></div>
    <div className="adm-grid adm-g2">
      <section className="adm-card"><h2 className="adm-section-title"><CreditCard size={20} /> Payment settings</h2><p className="sub">Flutterwave environment used by checkout</p>
        <div className="adm-setting-row"><div><b>Payment mode</b><p style={{ margin:"4px 0 0", color:"var(--a-muted)", fontSize:13 }}>{mode?.mode === "test" ? "Test keys and test records are active." : "Live keys and real charges are active."}</p></div>
          <div style={{ display:"flex", gap:8 }}><button className={`adm-btn ${mode?.mode === "live" ? "green" : "ghost"}`} disabled={!isSuper} onClick={() => change("live")}>LIVE</button><button className={`adm-btn ${mode?.mode === "test" ? "green" : "ghost"}`} disabled={!isSuper} onClick={() => change("test")}>TEST</button></div></div>
        {!isSuper && <p style={{ fontSize:12, color:"var(--a-muted)" }}><ShieldCheck size={14} style={{ verticalAlign:-2 }} /> Only the super admin can change payment mode.</p>}
      </section>
      <section className="adm-card"><h2 className="adm-section-title">Site and communication</h2><p className="sub">Current global details</p>
        <div className="adm-setting-row"><span>Primary website</span><a href="https://bootcamp.npdacademy.com" target="_blank" rel="noreferrer">bootcamp.npdacademy.com <ExternalLink size={13} /></a></div>
        <div className="adm-setting-row"><span>Email sender</span><b>info@hello.npdacademy.com</b></div>
        <div className="adm-setting-row"><span>Public contact</span><b>info@npdacademy.com</b></div>
      </section>
    </div>
    <section className="adm-card" style={{ marginTop:20 }}><h2 className="adm-section-title">Offer and countdown settings</h2><p style={{ margin:0, color:"var(--a-muted)", fontSize:13 }}>Course pricing, early-bird availability, headline, countdown deadline, payment wording, dates, and WhatsApp links are managed per cohort on the Cohorts page.</p></section>
  </>;
}