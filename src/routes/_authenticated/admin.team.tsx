import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { addAdmin, getMyRole, listAdmins, removeAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/team")({ component: Team });

function Team() {
  const listFn = useServerFn(listAdmins);
  const roleFn = useServerFn(getMyRole);
  const addFn = useServerFn(addAdmin);
  const removeFn = useServerFn(removeAdmin);
  const qc = useQueryClient();
  const { data: role } = useQuery({ queryKey: ["admin-role"], queryFn: () => roleFn() });
  const { data: admins = [], isLoading } = useQuery({ queryKey: ["admin-team"], queryFn: () => listFn() });
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const isSuper = role?.role === "super_admin";

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await addFn({ data: { email } });
      setEmail("");
      setMsg("Admin added.");
      qc.invalidateQueries({ queryKey: ["admin-team"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Couldn't add admin.");
    }
  }

  return (
    <>
      <div className="adm-head"><h1>Admins</h1></div>
      {isSuper && (
        <form className="adm-card" onSubmit={add} style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="adm-input" type="email" required placeholder="colleague@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="adm-btn">Add admin</button>
          {msg && <span style={{ fontSize: 13, color: "#6b6280" }}>{msg}</span>}
          <p style={{ width: "100%", margin: 0, fontSize: 12, color: "#6b6280" }}>They must first create an account on the admin sign-in page.</p>
        </form>
      )}
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : (
          <div className="adm-scroll"><table className="adm-table"><thead><tr><th>Email</th><th>Role</th><th>Since</th><th></th></tr></thead>
            <tbody>{admins.map((a) => (
              <tr key={a.user_id + a.role}><td>{a.email}</td><td><span className={`adm-pill ${a.role === "super_admin" ? "" : "registered"}`}>{a.role === "super_admin" ? "Super admin" : "Admin"}</span></td>
                <td>{new Date(a.created_at).toLocaleDateString("en-GB")}</td>
                <td className="num">{isSuper && a.role === "admin" && (
                  <button className="adm-btn ghost" onClick={async () => { await removeFn({ data: { userId: a.user_id } }); qc.invalidateQueries({ queryKey: ["admin-team"] }); }}>Remove</button>
                )}</td></tr>
            ))}</tbody></table></div>
        )}
      </div>
    </>
  );
}
