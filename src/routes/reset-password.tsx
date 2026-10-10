import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import "@/components/admin/admin.css";
import { PasswordInput } from "@/components/admin/PasswordInput";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Nerdy Pixels Academy" },
      { name: "description", content: "Choose a new password for your Nerdy Pixels Academy account." },
      { property: "og:title", content: "Set a new password | Nerdy Pixels Academy" },
      { property: "og:description", content: "Choose a new password for your Nerdy Pixels Academy account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setErr(error.message);
    else navigate({ to: "/admin" });
  }

  return (
    <div className="adm-auth">
      <div className="adm-auth-bg" aria-hidden="true"><img src="/brand/photos/hero-neon-1920.webp" srcSet="/brand/photos/hero-neon-960.webp 960w, /brand/photos/hero-neon-1920.webp 1920w" sizes="100vw" alt="" /></div>
      <div className="adm-auth-wrap">
      <div className="adm-auth-intro"><span className="adm-auth-kicker">Nerdy Pixels Academy</span><h2>Run the academy from one place.</h2><p>Enrollments, payments, emails, referrals and the website, all in your admin.</p></div>
      <form onSubmit={submit}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Set a new password</h1>
        {!ready ? (
          <p>Open this page from the reset link in your email. If the link expired, request a new one from the sign-in page.</p>
        ) : (
          <>
            <label>New password<PasswordInput required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
            {err && <p className="err">{err}</p>}
            <button className="adm-btn" style={{ padding: 12 }} disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
          </>
        )}
      </form>
      </div>
    </div>
  );
}
