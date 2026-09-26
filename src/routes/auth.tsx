import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestPasswordReset, requestSignup } from "@/lib/auth-actions.functions";
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

  const signupFn = useServerFn(requestSignup);
  const resetFn = useServerFn(requestPasswordReset);

  function friendly(msg: string) {
    if (/rate limit/i.test(msg)) return "Too many attempts. Please wait a few minutes and try again.";
    if (/invalid login/i.test(msg)) return "Wrong email or password.";
    if (/not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox (or use Forgot password to get a fresh link).";
    if (/fetch|network/i.test(msg)) return "Connection problem. Check your internet and try again.";
    return msg || "Something went wrong.";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setOk(""); setBusy(true);
    try {
      if (mode === "in") {
        let { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error && /fetch|network/i.test(error.message)) ({ error } = await supabase.auth.signInWithPassword({ email, password }));
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const r = await signupFn({ data: { email, password } });
        if (!r.ok) throw new Error(r.error);
        setOk("Check your email (from info@npdacademy.com) to confirm your account, then sign in.");
        setMode("in");
      }
    } catch (e) {
      setErr(friendly(e instanceof Error ? e.message : ""));
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  }

  async function forgot() {
    setErr(""); setOk("");
    if (!email) { setErr("Enter your email above first."); return; }
    setBusy(true);
    try {
      const r = await resetFn({ data: { email } });
      if (!r.ok) setErr(r.error ?? "Couldn't send the email.");
      else setOk("If that account exists, a reset link is on its way from info@npdacademy.com.");
    } catch (e) {
      setErr(friendly(e instanceof Error ? e.message : ""));
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
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
