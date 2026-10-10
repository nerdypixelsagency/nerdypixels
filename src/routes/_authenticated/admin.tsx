import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Menu, X, PanelLeftClose, PanelLeftOpen, LayoutDashboard, Users, Ticket, CalendarClock, ShieldCheck, LogOut, HandCoins, Inbox, GraduationCap, Settings, Eye, Mail, Coins, PanelsTopLeft, Clapperboard } from "lucide-react";
import { can, type Access } from "@/lib/access";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole, getPaymentModeFn } from "@/lib/admin.functions";
const logoDark = { url: "/brand/logo-dark.png" };
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-role"],
    retry: false,
    queryFn: async (): Promise<{ role: string | null; permissions?: string[] | null }> => {
      // 1) server check; 2) refresh session and retry; 3) direct check protected by database rules
      try { return await roleFn(); } catch (e1) { console.warn("role check failed, healing", e1); }
      try { await supabase.auth.refreshSession(); return await roleFn(); } catch (e2) { console.warn("retry failed, falling back", e2); }
      await supabase.rpc("claim_super_admin").then(() => undefined, () => undefined);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: rows, error: re } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      if (re) throw re;
      const roles = (rows ?? []).map((r) => r.role as string);
      return { role: roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : null };
    },
  });
  const qc = useQueryClient();
  const modeFn = useServerFn(getPaymentModeFn);
  const { data: modeData } = useQuery({ queryKey: ["pay-mode"], queryFn: () => modeFn(), enabled: !!data?.role });
  const mode = modeData?.mode ?? "live";
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop: collapse the sidebar to an icon rail; remembered on this device.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem("npa-adm-collapsed") === "1"); } catch { /* private mode */ } }, []);
  const toggleCollapsed = () => setCollapsed((c) => { try { localStorage.setItem("npa-adm-collapsed", c ? "0" : "1"); } catch { /* ignore */ } return !c; });
  useEffect(() => { document.body.style.overflow = menuOpen ? "hidden" : ""; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); }; addEventListener("keydown", k); return () => { removeEventListener("keydown", k); document.body.style.overflow = ""; }; }, [menuOpen]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading) return <div className="adm-auth" style={{ color: "#fff" }}>Loading…</div>;
  if (error)
    return (
      <div className="adm-auth">
        <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 420 }}>
          <h1 style={{ fontSize: 22 }}>Access check failed</h1>
          <p style={{ color: "#574e68" }}>We couldn't verify your admin access. Please refresh the page or sign in again.</p>
          <button className="adm-btn" onClick={() => window.location.reload()}>Try again</button>
          <button className="adm-btn ghost" onClick={signOut} style={{ marginLeft: 8 }}>Sign out</button>
        </div>
      </div>
    );
  if (!data?.role)
    return (
      <div className="adm-auth">
        <div style={{ background: "#fff", borderRadius: 18, padding: 32, maxWidth: 420 }}>
          <h1 style={{ fontSize: 22 }}>No admin access</h1>
          <p style={{ color: "#574e68" }}>
            {user.email} isn't an admin. Ask the super admin to add this account from the Admins page.
          </p>
          <button className="adm-btn" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );

  const access = data as Access;
  const nav = ([
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, perm: "dashboard" },
    { to: "/admin/enrolments", label: "Enrollments", icon: Users, perm: "enrolments" },
    { to: "/admin/leads", label: "Leads", icon: Inbox, perm: "leads" },
    { to: "/admin/emails", label: "Emails", icon: Mail, perm: "emails" },
    { to: "/admin/referrals", label: "Referrals", icon: Ticket, perm: "referrals" },
    { to: "/admin/instalments", label: "Instalments", icon: CalendarClock, perm: "instalments" },
    { to: "/admin/commissions", label: "Commissions", icon: HandCoins, perm: "commissions" },
    { to: "/admin/cohorts", label: "Cohorts", icon: GraduationCap, perm: "cohorts" },
    { to: "/admin/currencies", label: "Currencies", icon: Coins, perm: "currencies" },
    { to: "/admin/content", label: "Site content", icon: PanelsTopLeft, perm: "content" },
    { to: "/admin/media", label: "Media & syllabus", icon: Clapperboard, perm: "media" },
    { to: "/admin/preview", label: "View as", icon: Eye, perm: "preview" },
    { to: "/admin/team", label: "Admins & roles", icon: ShieldCheck, perm: "team" },
    { to: "/admin/settings", label: "Settings", icon: Settings, perm: "settings" },
  ] as const).filter((n) => can(access, n.perm) || (n.perm === "settings" && access.role === "admin") || (n.perm === "media" && can(access, "content")));

  return (
    <div className={`adm${menuOpen ? " menu-open" : ""}${collapsed ? " collapsed" : ""}`}>
      <aside className="adm-side" id="adm-menu" aria-label="Admin menu">
        <div className="adm-side-head">
          <img src={logoDark.url} alt="Nerdy Pixels Academy" />
          <button type="button" className="adm-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
          <button type="button" className="adm-collapse" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        </div>
        <div className="lbl">Pages</div>
        <nav className="adm-nav">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="nav" activeProps={{ className: "nav active" }} activeOptions={{ exact: "exact" in n }} onClick={() => setMenuOpen(false)} title={collapsed ? n.label : undefined} aria-label={n.label}>
              <n.icon size={16} /> <span>{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="foot">
          {user.email}
          <br />
          <a href="/" style={{ color: "#6420c9" }}>View site</a>
        </div>
      </aside>
      <div className="adm-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <main className="adm-main">
        <div className="adm-top">
          <button type="button" className="adm-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="adm-menu"><Menu size={20} /></button>
          <img className="adm-top-logo" src={logoDark.url} alt="Nerdy Pixels Academy" />
          <span className="adm-top-spacer" />
          <span className={`adm-chip ${mode === "test" ? "pending" : ""}`}>Payments: {mode === "test" ? "TEST" : "LIVE"}</span>
          <span className="adm-chip">{data.role === "super_admin" ? "Super admin" : access.permissions ? "Limited access" : "Admin"}</span>
          <button className="adm-btn ghost adm-signout" onClick={signOut} aria-label="Sign out"><LogOut size={14} style={{ verticalAlign: -2 }} /> <span>Sign out</span></button>
        </div>
        {mode === "test" && <div className="adm-card" style={{ background: "#fff4d6", marginBottom: 16, fontSize: 14 }}>Test mode is on. Checkout uses Flutterwave test keys and only test records are shown.</div>}
        <Outlet />
      </main>
    </div>
  );
}
