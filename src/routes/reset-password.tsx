import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import "@/components/admin/admin.css";

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
      <form onSubmit={submit}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Set a new password</h1>
        {!ready ? (
          <p>Open this page from the reset link in your email. If the link expired, request a new one from the sign-in page.</p>
        ) : (
          <>
            <label>New password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
            {err && <p className="err">{err}</p>}
            <button className="adm-btn" style={{ padding: 12 }} disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
          </>
        )}
      </form>
    </div>
  );
}
