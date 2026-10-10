import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { deleteMedia, listMedia, saveMedia } from "@/lib/site-admin.functions";
import { embedFor, VIDEO_HELP } from "@/lib/video";
import { uploadMedia } from "./upload";

type Kind = "testimonial" | "class_recording" | "logo";
type Item = { id?: string; kind: Kind; title: string; subtitle: string | null; quote: string | null; video_url: string | null; image_url: string | null; storage_path: string | null; sort: number; active: boolean };
const LABEL: Record<Kind, { one: string; many: string; help: string }> = {
  testimonial: { one: "testimonial", many: "Testimonials", help: "Graduate stories on the homepage. Add a video link (Vimeo recommended), a quote, or both. Without a photo, a default photo is shown." },
  class_recording: { one: "class recording", many: "Class recording", help: "The full class shown under \"See inside\". The first active recording with a video link is used." },
  logo: { one: "logo", many: "Alumni company logos", help: "Shown in the scrolling \"Our alumni have worked at\" strip. Upload SVG, PNG or WebP; photos are converted to WebP automatically." },
};
const DEFAULT_THUMB = "/brand/photos/testimonial-1-640.webp";

export function MediaManager({ kinds }: { kinds: Kind[] }) {
  const listFn = useServerFn(listMedia), saveFn = useServerFn(saveMedia), delFn = useServerFn(deleteMedia);
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({ queryKey: ["site-media"], queryFn: () => listFn() });
  const [edit, setEdit] = useState<Item | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["site-media"] });

  async function upload(file: File | undefined, field: "image_url" | "video_url") {
    if (!file || !edit) return;
    setBusy(field === "image_url" ? "Uploading image…" : "Uploading video…");
    try {
      const r = await uploadMedia(file, field === "video_url" ? "videos" : edit.kind === "logo" ? "logos" : "images");
      setEdit({ ...edit, [field]: r.url, storage_path: r.path });
      setMsg(`Uploaded (${Math.round(r.size / 1024)} KB${r.type === "image/webp" ? ", WebP" : ""}).`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(""); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!edit) return;
    try {
      await saveFn({ data: { id: edit.id, kind: edit.kind, title: edit.title, subtitle: edit.subtitle ?? "", quote: edit.quote ?? "", videoUrl: edit.video_url ?? "", imageUrl: edit.image_url ?? "", storagePath: edit.storage_path ?? "", sort: Number(edit.sort) || 0, active: edit.active } });
      setMsg("Saved. It's live on the site now."); setEdit(null); refresh();
    } catch (x) { setMsg((x as Error).message); }
  }
  const e = edit ? embedFor(edit.video_url) : null;

  return (
    <>
      {msg && <div className="adm-card" role="status" style={{ marginBottom: 12, fontSize: 14 }}>{msg}</div>}
      {kinds.map((kind) => {
        const rows = (data as Item[]).filter((m) => m.kind === kind);
        return (
          <section key={kind} className="adm-card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div><h2 className="adm-section-title" style={{ margin: 0 }}>{LABEL[kind].many}</h2><p className="sub" style={{ margin: "4px 0 0" }}>{LABEL[kind].help}</p></div>
              <button className="adm-btn" onClick={() => setEdit({ kind, title: "", subtitle: kind === "testimonial" ? "Graduate, last cohort" : "", quote: "", video_url: "", image_url: "", storage_path: "", sort: (rows.length + 1) * 10, active: true })}>Add {LABEL[kind].one}</button>
            </div>
            {edit?.kind === kind && (
              <form className="adm-form-grid" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #ece6f8" }} onSubmit={submit}>
                <label>{kind === "logo" ? "Company name" : "Name / title"}<input className="adm-input" required value={edit.title} onChange={(x) => setEdit({ ...edit, title: x.target.value })} /></label>
                {kind !== "logo" && <label>{kind === "testimonial" ? "Role, e.g. Graduate, last cohort" : "Caption, e.g. Last cohort"}<input className="adm-input" value={edit.subtitle ?? ""} onChange={(x) => setEdit({ ...edit, subtitle: x.target.value })} /></label>}
                {kind === "testimonial" && <label className="full">Quote (optional, their own words)<textarea className="adm-input" rows={3} value={edit.quote ?? ""} onChange={(x) => setEdit({ ...edit, quote: x.target.value })} /></label>}
                {kind !== "logo" && (
                  <label className="full">Video link (Vimeo, YouTube, Google Drive) or upload an MP4
                    <input className="adm-input" type="url" placeholder="https://vimeo.com/123456789" value={edit.video_url ?? ""} onChange={(x) => setEdit({ ...edit, video_url: x.target.value })} />
                    <span style={{ fontSize: 12, color: edit.video_url && !e ? "#a11" : "#6b6280" }}>{edit.video_url ? (e ? `✓ ${e.provider === "file" ? "Video file" : e.provider[0]!.toUpperCase() + e.provider.slice(1)}. ${VIDEO_HELP[e.provider]}` : "We can't play this link. Use a Vimeo, YouTube or Google Drive link, or upload an MP4.") : "Videos play in a pop-up on our page. Visitors can't be taken to another site from the player."}</span>
                    <input type="file" accept="video/mp4,video/webm" onChange={(x) => upload(x.target.files?.[0], "video_url")} />
                  </label>
                )}
                <label className="full">{kind === "logo" ? "Logo" : "Photo / thumbnail"} {kind !== "logo" && <span style={{ fontWeight: 400, color: "#6b6280" }}>(optional; a default photo is used)</span>}
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <img className="adm-thumb" src={edit.image_url || (kind === "logo" ? "" : e?.thumb || DEFAULT_THUMB)} alt="" style={kind === "logo" ? { objectFit: "contain", background: "#fff", border: "1px solid #ece6f8" } : undefined} />
                    <input type="file" accept={kind === "logo" ? "image/svg+xml,image/png,image/webp,image/jpeg" : "image/png,image/jpeg,image/webp"} onChange={(x) => upload(x.target.files?.[0], "image_url")} />
                    <input className="adm-input" style={{ flex: "1 1 220px" }} placeholder="…or paste an image link (https://)" value={edit.image_url ?? ""} onChange={(x) => setEdit({ ...edit, image_url: x.target.value })} />
                  </div>
                </label>
                <label>Order (lower shows first)<input className="adm-input" type="number" value={edit.sort} onChange={(x) => setEdit({ ...edit, sort: Number(x.target.value) })} /></label>
                <label style={{ flexDirection: "row", alignItems: "center" }}><input type="checkbox" checked={edit.active} onChange={(x) => setEdit({ ...edit, active: x.target.checked })} /> Show on the site</label>
                {e && (
                  <div className="full"><p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>Preview</p>
                    <div style={{ aspectRatio: "16/9", maxWidth: 520, borderRadius: 12, overflow: "hidden", background: "#000" }}>
                      {e.kind === "video" ? <video src={e.src} controls style={{ width: "100%", height: "100%" }} controlsList="nodownload" />
                        : <iframe src={e.src.replace("autoplay=1", "autoplay=0")} title="Preview" style={{ width: "100%", height: "100%", border: 0 }} allow="fullscreen; picture-in-picture; encrypted-media" sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" />}
                    </div>
                  </div>
                )}
                <div className="full" style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="adm-btn green" disabled={!!busy}>Save {LABEL[kind].one}</button><button className="adm-btn ghost" type="button" onClick={() => setEdit(null)}>Cancel</button>{busy && <span style={{ fontSize: 13 }}>{busy}</span>}</div>
              </form>
            )}
            {isLoading ? <p className="adm-empty">Loading…</p> : error ? <p className="adm-empty">{(error as Error).message}</p> : rows.length === 0 ? <p className="adm-empty">None yet</p> : (
              <div className="adm-scroll" style={{ marginTop: 12 }}><table className="adm-table"><tbody>{rows.map((m) => (
                <tr key={m.id}>
                  <td style={{ width: 84 }}><img className="adm-thumb" src={m.image_url || (m.kind === "logo" ? "" : embedFor(m.video_url)?.thumb || DEFAULT_THUMB)} alt="" style={m.kind === "logo" ? { objectFit: "contain", background: "#fff" } : undefined} /></td>
                  <td><b>{m.title}</b>{m.subtitle && <><br /><span className="sub">{m.subtitle}</span></>}{m.kind !== "logo" && <><br /><span style={{ fontSize: 12, color: embedFor(m.video_url) ? "#0f6b35" : "#8a5200" }}>{embedFor(m.video_url) ? `Video: ${embedFor(m.video_url)!.provider}` : "No video yet (shows the photo)"}</span></>}</td>
                  <td><span className={`adm-pill ${m.active ? "" : "registered"}`}>{m.active ? "shown" : "hidden"}</span></td>
                  <td className="num" style={{ whiteSpace: "nowrap" }}><button className="adm-btn ghost" onClick={() => setEdit({ ...m })}>Edit</button>{" "}
                    <button className="adm-btn ghost" onClick={async () => { if (!confirm(`Delete ${m.title}?`)) return; try { await delFn({ data: { id: m.id! } }); refresh(); } catch (x) { setMsg((x as Error).message); } }}>Delete</button></td>
                </tr>
              ))}</tbody></table></div>
            )}
          </section>
        );
      })}
    </>
  );
}
