import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { addAdmin, getMyRole, listAdmins, removeAdmin } from "@/lib/admin.functions";
import { setAdminAccess } from "@/lib/site-admin.functions";
import { PERMS, PRESETS } from "@/lib/access";
import { FilterToolbar } from "@/components/admin/FilterToolbar";

export const Route = createFileRoute("/_authenticated/admin/team")({
  head: () => ({ meta: [{ title: "Admins & roles | Nerdy Pixels Academy Admin" }, { name: "robots", content: "noindex" }] }),
  component: Team,
});

type Row = { user_id: string; email: string | null; role: string; created_at: string; permissions?: string[] | null; preset?: string | null };
const presetOf = (a: Row) => a.preset && (PRESETS[a.preset] || a.preset === "custom") ? a.preset : a.permissions ? "custom" : "full";
const accessText = (a: Row) => a.permissions == null ? "Every page except Admins and Settings" : a.permissions.length ? a.permissions.map((p) => PERMS.find((x) => x[0] === p)?.[1] ?? p).join(", ") : "No pages";

function Team() {
  const listFn = useServerFn(listAdmins), roleFn = useServerFn(getMyRole), addFn = useServerFn(addAdmin), removeFn = useServerFn(removeAdmin), accessFn = useServerFn(setAdminAccess);
  const qc = useQueryClient();
  const { data: role } = useQuery({ queryKey: ["admin-role"], queryFn: () => roleFn() });
  const { data: admins = [], isLoading } = useQuery({ queryKey: ["admin-team"], queryFn: () => listFn() });
  const [email, setEmail] = useState("");
  const [preset, setPreset] = useState("full");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<{ userId: string; preset: string; perms: string[] } | null>(null);
  const isSuper = role?.role === "super_admin";

  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    try {
      const r = await addFn({ data: { email, preset } });
      setEmail("");
      setMsg(r.invited ? "Admin added. A set-password email is on its way to them." : "Admin added. A fresh set-password email has been sent to them.");
      qc.invalidateQueries({ queryKey: ["admin-team"] });
    } catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't add admin."); }
  }
  async function saveAccess() {
    if (!edit) return;
    try {
      await accessFn({ data: { userId: edit.userId, preset: edit.preset, permissions: edit.preset === "custom" ? edit.perms as never : null } });
      setEdit(null); setMsg("Access updated. It applies the next time they open a page.");
      qc.invalidateQueries({ queryKey: ["admin-team"] });
    } catch (err) { setMsg(err instanceof Error ? err.message : "Couldn't update access."); }
  }
  const rows = (admins as Row[]).filter((a) => !search || [a.email, a.role, a.preset].some((v) => v?.toLowerCase().includes(search.toLowerCase())));

  return (
    <>
      <div className="adm-head"><h1>Admins & roles</h1></div>
      {isSuper && (
        <form className="adm-card" onSubmit={add} style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="adm-input" style={{ flex: "1 1 240px" }} type="email" required placeholder="colleague@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <select className="adm-select" value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Role">
            {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
          <button className="adm-btn">Add admin</button>
          <p style={{ width: "100%", margin: 0, fontSize: 12, color: "#6b6280" }}>{PRESETS[preset]?.help} No account needed first: we email them a link to set their password.</p>
          {msg && <p role="status" style={{ width: "100%", margin: 0, fontSize: 13, color: "#3b0f86" }}>{msg}</p>}
        </form>
      )}
      {isSuper && (
        <div className="adm-card" style={{ marginBottom: 20 }}>
          <h2 className="adm-section-title" style={{ marginTop: 0 }}>Roles</h2>
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Role</th><th>Can open</th></tr></thead><tbody>
            <tr><td><b>Super admin</b></td><td>Everything, including Admins & roles, Settings, payment mode and automated emails.</td></tr>
            {Object.entries(PRESETS).map(([k, p]) => <tr key={k}><td><b>{p.label}</b></td><td>{p.perms ? p.perms.map((x) => PERMS.find((q) => q[0] === x)?.[1]).join(", ") : p.help}</td></tr>)}
            <tr><td><b>Custom</b></td><td>Pick exactly which pages an admin can open.</td></tr>
          </tbody></table></div>
        </div>
      )}
      <FilterToolbar search={search} onSearch={setSearch} placeholder="Search admin email or role" active={!!search} onReset={() => setSearch("")} />
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : (
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Email</th><th>Role</th><th>Access</th><th>Since</th><th></th></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.user_id + a.role}>
                <td>{a.email}</td>
                <td><span className={`adm-pill ${a.role === "super_admin" ? "" : "registered"}`}>{a.role === "super_admin" ? "Super admin" : presetOf(a) === "custom" ? "Custom" : PRESETS[presetOf(a)]?.label}</span></td>
                <td style={{ maxWidth: 360, fontSize: 13 }}>
                  {edit?.userId === a.user_id ? (
                    <div>
                      <select className="adm-select" value={edit.preset} onChange={(e) => setEdit({ ...edit, preset: e.target.value, perms: e.target.value === "custom" ? edit.perms : (PRESETS[e.target.value]?.perms ?? PERMS.map((p) => p[0])) as string[] })}>
                        {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}<option value="custom">Custom</option>
                      </select>
                      {edit.preset === "custom" && (
                        <div className="adm-checks">{PERMS.map(([k, label]) => (
                          <label key={k}><input type="checkbox" checked={edit.perms.includes(k)} onChange={(e) => setEdit({ ...edit, perms: e.target.checked ? [...edit.perms, k] : edit.perms.filter((x) => x !== k) })} /> {label}</label>
                        ))}</div>
                      )}
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button className="adm-btn green" onClick={saveAccess}>Save</button><button className="adm-btn ghost" onClick={() => setEdit(null)}>Cancel</button></div>
                    </div>
                  ) : a.role === "super_admin" ? "Everything" : accessText(a)}
                </td>
                <td>{new Date(a.created_at).toLocaleDateString("en-GB")}</td>
                <td className="num" style={{ whiteSpace: "nowrap" }}>{isSuper && a.role === "admin" && edit?.userId !== a.user_id && (<>
                  <button className="adm-btn ghost" onClick={() => setEdit({ userId: a.user_id, preset: presetOf(a), perms: a.permissions ?? PERMS.map((p) => p[0]) })}>Edit access</button>{" "}
                  <button className="adm-btn ghost" onClick={async () => { if (!confirm(`Remove ${a.email} as an admin?`)) return; await removeFn({ data: { userId: a.user_id } }); qc.invalidateQueries({ queryKey: ["admin-team"] }); }}>Remove</button>
                </>)}</td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>
    </>
  );
}
