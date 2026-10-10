import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileText } from "lucide-react";
import { deleteSyllabus, listSyllabi, saveSyllabus } from "@/lib/site-admin.functions";
import { MediaManager } from "@/components/admin/MediaManager";
import { uploadMedia } from "@/components/admin/upload";

export const Route = createFileRoute("/_authenticated/admin/media")({
  head: () => ({ meta: [{ title: "Media & syllabus | Nerdy Pixels Academy Admin" }, { name: "robots", content: "noindex" }] }),
  component: MediaPage,
});

function MediaPage() {
  return (
    <>
      <div className="adm-head"><h1>Media & syllabus</h1><Link to="/admin/content" className="adm-btn ghost" style={{ textDecoration: "none" }}>Open the site content builder</Link></div>
      <Syllabus />
      <MediaManager kinds={["testimonial", "class_recording", "logo"]} />
    </>
  );
}

type Syl = { id: string; title: string; file_url: string; storage_path: string | null; active: boolean; created_at: string; updated_at: string };
function where(s: Syl) {
  if (s.storage_path) return `Stored in Supabase Storage › media › ${s.storage_path}`;
  if (/drive\.google\.com/.test(s.file_url)) return "Google Drive link";
  return "External link";
}

function Syllabus() {
  const listFn = useServerFn(listSyllabi), saveFn = useServerFn(saveSyllabus), delFn = useServerFn(deleteSyllabus);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["syllabi"], queryFn: () => listFn() });
  const [title, setTitle] = useState("Digital Marketing Bootcamp syllabus");
  const [link, setLink] = useState("");
  const [path, setPath] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["syllabi"] });

  async function upload(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf") return setMsg("Upload a PDF file.");
    setBusy(true); setMsg("");
    try { const r = await uploadMedia(file, "syllabus"); setLink(r.url); setPath(r.path); setMsg(`Uploaded ${Math.round(r.size / 1024)} KB. Save to make it the live syllabus.`); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    try { await saveFn({ data: { title, fileUrl: link, storagePath: path, active: true } }); setLink(""); setPath(""); setMsg("Saved. This is now the syllabus visitors receive by email."); refresh(); }
    catch (x) { setMsg((x as Error).message); }
  }
  const rows = (data?.rows ?? []) as Syl[];
  return (
    <section className="adm-card" style={{ marginBottom: 16 }}>
      <h2 className="adm-section-title" style={{ marginTop: 0 }}><FileText size={20} /> Syllabus</h2>
      <p className="sub">Visitors request it with the "Download the syllabus" button. They get the link by email and appear on the Leads page as <b>Syllabus</b> ({data?.requests ?? 0} requests so far). The button only shows on the site when a syllabus is active.</p>
      <form className="adm-form-grid" onSubmit={save}>
        <label>Title<input className="adm-input" required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Upload a PDF<input type="file" accept="application/pdf" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} /></label>
        <label className="full">…or paste a link (Google Drive: set sharing to "Anyone with the link")<input className="adm-input" type="url" required placeholder="https://drive.google.com/file/d/…/view" value={link} onChange={(e) => { setLink(e.target.value); setPath(""); }} /></label>
        <div className="full" style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="adm-btn green" disabled={busy || !link}>Save as the live syllabus</button>{msg && <span role="status" style={{ fontSize: 13 }}>{msg}</span>}</div>
      </form>
      {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : rows.length > 0 && (
        <div className="adm-scroll" style={{ marginTop: 12 }}><table className="adm-table"><thead><tr><th>Syllabus</th><th>Where it's located</th><th>Status</th><th></th></tr></thead><tbody>
          {rows.map((s) => (
            <tr key={s.id}><td><b>{s.title}</b><br /><span className="sub">Updated {new Date(s.updated_at).toLocaleDateString("en-GB")}</span></td>
              <td style={{ fontSize: 13 }}>{where(s)}<br /><a href={s.file_url} target="_blank" rel="noreferrer">Open file</a></td>
              <td><span className={`adm-pill ${s.active ? "" : "registered"}`}>{s.active ? "live" : "old"}</span></td>
              <td className="num" style={{ whiteSpace: "nowrap" }}>{!s.active && <button className="adm-btn ghost" onClick={async () => { await saveFn({ data: { id: s.id, title: s.title, fileUrl: s.file_url, storagePath: s.storage_path ?? "", active: true } }); refresh(); }}>Make live</button>}{" "}
                <button className="adm-btn ghost" onClick={async () => { if (!confirm("Delete this syllabus file?")) return; await delFn({ data: { id: s.id } }); refresh(); }}>Delete</button></td></tr>
          ))}
        </tbody></table></div>
      )}
    </section>
  );
}
