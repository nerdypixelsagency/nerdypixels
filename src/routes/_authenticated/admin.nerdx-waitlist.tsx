import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getNerdxWaitlist, setNerdxGate } from "@/lib/nerdx.functions";
import { download } from "@/components/admin/data";
import { FilterToolbar } from "@/components/admin/FilterToolbar";

export const Route = createFileRoute("/_authenticated/admin/nerdx-waitlist")({
  head: () => ({ meta: [{ title: "NerdX SEO waitlist | Nerdy Pixels Admin" }, { name: "robots", content: "noindex" }] }),
  component: NerdxWaitlist,
});

const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function NerdxWaitlist() {
  const fn = useServerFn(getNerdxWaitlist);
  const gateFn = useServerFn(setNerdxGate);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["nerdx-waitlist"], queryFn: () => fn() });
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => !t || [r.email, r.name, r.role, r.use_case, r.website, r.challenge].some((v) => v?.toLowerCase().includes(t)));
  }, [data, search]);

  async function toggleGate(on: boolean) {
    setBusy(true); setMsg("");
    try { await gateFn({ data: { gate: on } }); qc.invalidateQueries({ queryKey: ["nerdx-waitlist"] }); setMsg(on ? "Gate on — visitors must join before viewing." : "Gate off — visitors can explore first."); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  function exportCsv() {
    const head = ["Joined", "Email", "Name", "I'm a", "Use it for", "Website", "Biggest challenge", "Timeline", "Beta"];
    const body = rows.map((r) => [r.created_at, r.email, r.name, r.role, r.use_case, r.website, r.challenge, r.timeline, r.beta ? "Yes" : ""].map(q).join(","));
    download("nerdx-waitlist.csv", [head.join(","), ...body].join("\n"));
  }

  const gate = data?.gate ?? false;
  return (
    <>
      <div className="adm-head"><h1>NerdX SEO waitlist</h1>
        <button className="adm-btn green" disabled={!rows.length} onClick={exportCsv}>Export CSV ({rows.length})</button>
      </div>
      {msg && <div className="adm-card" style={{ marginBottom: 16, fontSize: 14 }} role="status">{msg}</div>}

      <section className="adm-card" style={{ marginBottom: 16 }}>
        <div className={`adm-master ${gate ? "off" : "on"}`}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 15 }}>Require visitors to join before viewing</b>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--a-muted)" }}>{gate ? "On — the waitlist pop-up blocks the landing until a visitor joins." : "Off — the pop-up greets visitors but they can explore the app first. Every signup button still opens it."}</p>
          </div>
          <label className={`adm-switch lg ${gate ? "on" : ""}`} style={{ cursor: busy ? "default" : "pointer" }}>
            <input type="checkbox" checked={gate} disabled={busy} onChange={(e) => toggleGate(e.target.checked)} aria-label="Require visitors to join before viewing" />
            <i />
          </label>
        </div>
      </section>

      <FilterToolbar search={search} onSearch={setSearch} placeholder="Search email, name, use case, website…" active={!!search} onReset={() => setSearch("")} />
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : rows.length === 0 ? <p className="adm-empty">No waitlist signups yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Joined</th><th>Email</th><th>Name</th><th>I'm a</th><th>Use it for</th><th>Website</th><th>Biggest challenge</th><th>Timeline</th><th>Beta</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td><b>{r.email}</b></td>
                <td>{r.name ?? "—"}</td>
                <td>{r.role ?? "—"}</td>
                <td style={{ maxWidth: 220 }}>{r.use_case ?? "—"}</td>
                <td>{r.website ? <a href={/^https?:\/\//.test(r.website) ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer">{r.website}</a> : "—"}</td>
                <td style={{ maxWidth: 260 }}>{r.challenge ?? "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{r.timeline ?? "—"}</td>
                <td>{r.beta ? <span className="adm-pill paid">Yes</span> : "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
