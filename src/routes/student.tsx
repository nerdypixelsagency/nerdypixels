import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyStudentRecords, requestStudentLink } from "@/lib/student.functions";
import "@/site/site.css";
import "@/site/brand.css";
import "@/site/premium.css";

export const Route = createFileRoute("/student")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Student area | Nerdy Pixels Academy" },
      { name: "description", content: "See your Nerdy Pixels Academy payments and pay your next instalment." },
      { property: "og:title", content: "Student area | Nerdy Pixels Academy" },
      { property: "og:description", content: "See your payments and pay your next instalment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Student,
});

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

function Student() {
  const [session, setSession] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "var(--canvas)" }}>
      <header className="top"><div className="wrap nav"><a className="logo" href="/"><img src="/brand/logo-dark.png" alt="Nerdy Pixels Academy" width={64} height={42} style={{ height: 42, width: "auto" }} /></a><a className="btn ghost sm" href="/">Back to site</a></div></header>
      <main id="main" className="section"><div className="wrap" style={{ maxWidth: 760 }}>
        {session === null ? <p className="muted">Loading…</p> : session ? <Dashboard /> : <SignIn />}
      </div></main>
    </div>
  );
}

function SignIn() {
  const fn = useServerFn(requestStudentLink);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter the email you used when you enrolled.");
    setState("busy");
    const r = await fn({ data: { email } }).catch(() => ({ ok: false, error: "Something went wrong. Please try again." }));
    if (!r.ok) { setErr(("error" in r && r.error) || "Please try again."); setState("idle"); return; }
    setState("sent");
  }
  return (
    <div className="card stack" style={{ gap: 18, padding: 32 }}>
      <h1 style={{ fontSize: "clamp(28px,5vw,40px)" }}>Student area</h1>
      {state === "sent" ? (
        <p className="lead">If <b>{email}</b> is enrolled, a sign-in link is on its way from info@npdacademy.com. Open it on this device.</p>
      ) : (
        <form className="stack" style={{ gap: 14 }} onSubmit={submit} noValidate>
          <p className="muted">Enter the email you used at checkout. We'll email you a one-time sign-in link, no password needed.</p>
          <label className="f">Email address<input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
          {err && <p className="err" role="alert">{err}</p>}
          <button className="btn green" type="submit" disabled={state === "busy"}>{state === "busy" ? "Sending…" : "Email me a sign-in link"}</button>
        </form>
      )}
    </div>
  );
}

function Dashboard() {
  const fn = useServerFn(getMyStudentRecords);
  const { data, isLoading, error } = useQuery({ queryKey: ["student"], queryFn: () => fn(), retry: 1 });
  if (isLoading) return <p className="muted">Loading your payments…</p>;
  if (error || !data) return <div className="card stack" style={{ gap: 12 }}><p className="err">{(error as Error)?.message ?? "Could not load your records."}</p><button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button></div>;
  const rows = data.rows as Array<{ id: string; kind: string; plan: string | null; instalment_month: string | null; amount: number; status: string; paid_at: string | null; created_at: string; tx_ref: string | null }>;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "clamp(28px,5vw,40px)" }}>Hi {data.name.split(" ")[0] || "there"}</h1>
        <button className="btn ghost sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
      {data.nextDue ? (
        <div className="band"><div className="stack" style={{ gap: 6 }}><h2 style={{ fontSize: 24 }}>{data.nextDue} instalment: {naira(40000)}</h2><p className="muted">Due {data.dueDates[data.nextDue as "December"]}.</p></div>
          <a className="btn green" href="/pay-instalment">Pay next instalment</a></div>
      ) : (
        <div className="card"><b>You're all paid up.</b> <span className="muted">Classes start Thursday 5 November 2026.</span></div>
      )}
      <div className="card"><h2 style={{ fontSize: 20, marginBottom: 12 }}>Payment history</h2>
        {rows.length === 0 ? <p className="muted">No payments yet.</p> : (
          <div className="tw"><table className="table"><thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Status</th><th>Receipt ref</th></tr></thead><tbody>
            {rows.map((r) => <tr key={r.id}><td>{new Date(r.paid_at ?? r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
              <td>{r.kind === "instalment" ? `${r.instalment_month} instalment` : r.kind === "event" ? "Free event" : r.plan === "early" ? "Bootcamp, early bird" : "Bootcamp, first month"}</td>
              <td>{r.amount ? naira(r.amount) : "—"}</td><td><span className={`pill ${r.status === "paid" ? "green" : ""}`}>{r.status}</span></td><td className="small muted">{r.tx_ref}</td></tr>)}
          </tbody></table></div>
        )}
      </div>
    </div>
  );
}
