import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getLeads } from "@/lib/admin-tools.functions";
import { download } from "@/components/admin/data";
import { FilterToolbar } from "@/components/admin/FilterToolbar";

export const Route = createFileRoute("/_authenticated/admin/leads")({ component: Leads });

const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function Leads() {
  const fn = useServerFn(getLeads);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-leads"], queryFn: () => fn() });
  const [s, setS] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const t = s.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) =>
      (!from || r.created_at.slice(0, 10) >= from) &&
      (!to || r.created_at.slice(0, 10) <= to) &&
      (!t || [r.first_name, r.last_name, r.email, r.phone, r.country, r.source].some((v) => v?.toLowerCase().includes(t))),
    );
  }, [data, s, from, to]);

  function exportCsv() {
    const head = ["Date", "First name", "Last name", "Email", "WhatsApp", "Country", "Heard about us"];
    const body = rows.map((r) => [r.created_at, r.first_name, r.last_name, r.email, r.phone, r.country, r.source].map(q).join(","));
    download("leads.csv", [head.join(","), ...body].join("\n"));
  }

  return (
    <>
      <div className="adm-head"><h1>Leads</h1><button className="adm-btn green" onClick={exportCsv}>Export CSV ({rows.length})</button></div>
      <FilterToolbar search={s} onSearch={setS} placeholder="Search name, email, phone, country, source" from={from} to={to} onFrom={setFrom} onTo={setTo} active={!!(s || from || to)} onReset={() => { setS(""); setFrom(""); setTo(""); }} />
      <div className="adm-card">
        {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : rows.length === 0 ? <p className="adm-empty">No leads yet</p> : (
          <div className="adm-scroll"><table className="adm-table">
            <thead><tr><th>Date</th><th>Name</th><th>Email</th><th>WhatsApp</th><th>Country</th><th>Heard about us</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td>{r.first_name} {r.last_name}</td>
                <td>{r.email}</td>
                <td>{r.phone}</td>
                <td>{r.country ?? "—"}</td>
                <td>{r.source ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
