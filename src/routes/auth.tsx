import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logoDark from "@/assets/logo-dark.png.asset.json";
import "@/components/admin/admin.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in | Nerdy Pixels Academy" },
      { name: "description", content: "Sign in to the Nerdy Pixels Academy admin dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setOk(""); setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
        if (error) throw error;
        if (data.session) navigate({ to: "/admin" });
        else setOk("Check your email to confirm your account, then sign in.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function forgot() {
    setErr(""); setOk("");
    if (!email) { setErr("Enter your email above first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setErr(error.message);
    else setOk("If that account exists, a reset link is on its way.");
  }

  return (
    <div className="adm-auth">
      <form onSubmit={submit}>
        <img src={logoDark.url} alt="Nerdy Pixels Academy" style={{ height: 44, width: "auto", alignSelf: "flex-start" }} />
        <h1 style={{ fontSize: 22, margin: "6px 0 0" }}>{mode === "in" ? "Admin sign in" : "Create admin account"}</h1>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></label>
        {err && <p className="err">{err}</p>}
        {ok && <p className="ok">{ok}</p>}
        <button className="adm-btn" style={{ padding: 12 }} disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} style={{ background: "none", border: 0, color: "#6420c9", fontWeight: 600, cursor: "pointer", font: "inherit", fontSize: 13 }}>
          {mode === "in" ? "First time? Create an account" : "Already have an account? Sign in"}
        </button>
        {mode === "in" && (
          <button type="button" onClick={forgot} style={{ background: "none", border: 0, color: "#6420c9", cursor: "pointer", font: "inherit", fontSize: 13 }}>
            Forgot password?
          </button>
        )}
      </form>
    </div>
  );
}
