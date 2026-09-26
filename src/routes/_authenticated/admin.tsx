import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, Users, Ticket, CalendarClock, ShieldCheck, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole, getPaymentModeFn, setPaymentMode } from "@/lib/admin.functions";
import logoDark from "@/assets/logo-dark.png.asset.json";
import "@/components/admin/admin.css";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin dashboard | Nerdy Pixels Academy" },
      { name: "description", content: "Enrolments, referrals and payments for Nerdy Pixels Academy." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const roleFn = useServerFn(getMyRole);
  const { data, isLoading } = useQuery({ queryKey: ["admin-role"], queryFn: () => roleFn() });
  const qc = useQueryClient();
  const modeFn = useServerFn(getPaymentModeFn);
  const setModeFn = useServerFn(setPaymentMode);
  const { data: modeData } = useQuery({ queryKey: ["pay-mode"], queryFn: () => modeFn(), enabled: !!data?.role });
  const mode = modeData?.mode ?? "live";
  async function toggleMode() {
    const next = mode === "live" ? "test" : "live";
    if (!confirm(next === "test" ? "Switch to TEST mode? Buyers won't be charged real money." : "Switch to LIVE mode? Buyers will be charged real money.")) return;
    await setModeFn({ data: { mode: next } });
    qc.invalidateQueries();
  }
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) return <div className="adm-auth" style={{ color: "#fff" }}>Loading…</div>;
  if (!data?.role)
    return (
      <div className="adm-auth">
        <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 420 }}>
          <h1 style={{ fontSize: 22 }}>No admin access</h1>
          <p style={{ color: "#574e68" }}>
            {user.email} isn't an admin yet. If this is the owner account, confirm your email first. Otherwise ask the super admin to add you.
          </p>
          <button className="adm-btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );

  const nav = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/enrolments", label: "Enrolments", icon: Users },
    { to: "/admin/referrals", label: "Referrals", icon: Ticket },
    { to: "/admin/instalments", label: "Instalments", icon: CalendarClock },
    { to: "/admin/team", label: "Admins", icon: ShieldCheck },
  ] as const;

  return (
    <div className="adm">
      <aside className="adm-side">
        <img src={logoDark.url} alt="Nerdy Pixels Academy" />
        <div className="lbl">Pages</div>
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="nav" activeProps={{ className: "nav active" }} activeOptions={{ exact: "exact" in n }}>
            <n.icon size={16} /> {n.label}
          </Link>
        ))}
        <div className="foot">
          {user.email}
          <br />
          <a href="/" style={{ color: "#6420c9" }}>View site</a>
        </div>
      </aside>
      <main className="adm-main">
        <div className="adm-top">
          {data.role === "super_admin" ? (
            <button className="adm-btn ghost" onClick={toggleMode} title="Switch payment mode" style={mode === "test" ? { background: "#fff4d6", borderColor: "#e0a800", color: "#7a5a00" } : undefined}>
              Payments: <b>{mode === "test" ? "TEST" : "LIVE"}</b> · switch
            </button>
          ) : (
            <span className="adm-chip">Payments: {mode === "test" ? "TEST" : "LIVE"}</span>
          )}
          <span className="adm-chip">{data.role === "super_admin" ? "Super admin" : "Admin"}</span>
          <button className="adm-btn ghost" onClick={signOut}><LogOut size={14} style={{ verticalAlign: -2 }} /> Sign out</button>
        </div>
        {mode === "test" && <div className="adm-card" style={{ background: "#fff4d6", marginBottom: 16, fontSize: 14 }}>Test mode is on. Checkout uses Flutterwave test keys and only test records are shown.</div>}
        <Outlet />
      </main>
    </div>
  );
}
