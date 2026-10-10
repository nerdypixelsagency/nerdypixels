import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MailCheck, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { AUTO_EMAILS } from "@/lib/access";
import { getAutomation, saveAutomation, sendSummaryNow } from "@/lib/site-admin.functions";

/** Super admin: switch each automated email on or off, and choose who gets the daily statistics. */
export function AutomationCard() {
  const getFn = useServerFn(getAutomation), saveFn = useServerFn(saveAutomation), sendFn = useServerFn(sendSummaryNow);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["automation"], queryFn: () => getFn() });
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [recipients, setRecipients] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setFlags(data.flags); setRecipients(data.recipients.join(", ")); } }, [data]);

  const list = recipients.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const bad = list.filter((e) => !/^\S+@\S+\.\S+$/.test(e));
  async function save() {
    if (bad.length) return setMsg(`Check these addresses: ${bad.join(", ")}`);
    if (!list.length) return setMsg("Add at least one recipient for the daily statistics.");
    setBusy(true); setMsg("");
    try { await saveFn({ data: { flags, recipients: list } }); setMsg("Saved. Changes apply within a minute."); qc.invalidateQueries({ queryKey: ["automation"] }); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  async function sendNow() {
    setBusy(true); setMsg("");
    try { const r = await sendFn(); setMsg("sentTo" in r && r.sentTo ? `Daily statistics sent to ${r.sentTo.join(", ")}.` : "Sent."); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <section className="adm-card" style={{ marginTop: 20 }}>
      <h2 className="adm-section-title"><MailCheck size={20} /> Automated emails</h2>
      <p className="sub">Switch automatic emails on or off. Emails you send by hand from the admin always go out.</p>
      {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : (
        <>
          {AUTO_EMAILS.map(([key, label, help]) => (
            <label key={key} className="adm-setting-row" style={{ cursor: "pointer" }}>
              <div><b>{label}</b><p style={{ margin: "4px 0 0", color: "var(--a-muted)", fontSize: 13 }}>{help}</p></div>
              <span className={`adm-switch ${flags[key] !== false ? "on" : ""}`}>
                <input type="checkbox" checked={flags[key] !== false} onChange={(e) => setFlags({ ...flags, [key]: e.target.checked })} aria-label={label} />
                <i />
              </span>
            </label>
          ))}
          <div className="adm-setting-row" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px" }}><b>Daily statistics recipients</b><p style={{ margin: "4px 0 0", color: "var(--a-muted)", fontSize: 13 }}>Sent every morning at 8:00 WAT. Separate addresses with commas.</p></div>
            <textarea className="adm-input" rows={2} style={{ flex: "1 1 320px" }} value={recipients} onChange={(e) => setRecipients(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
            <button className="adm-btn green" disabled={busy} onClick={save}>Save email settings</button>
            <button className="adm-btn ghost" disabled={busy} onClick={sendNow}><Send size={14} style={{ verticalAlign: -2 }} /> Send today's statistics now</button>
            {msg && <span role="status" style={{ fontSize: 13, color: "var(--a-muted)" }}>{msg}</span>}
          </div>
        </>
      )}
    </section>
  );
}
