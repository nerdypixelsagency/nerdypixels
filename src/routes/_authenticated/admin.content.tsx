import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Monitor, RefreshCw, RotateCcw, Smartphone, Tablet, Trash2 } from "lucide-react";
import { HOME_DEFAULTS, HOME_SCHEMA, LIVE_TOKENS, mergeHome, type Field } from "@/lib/cms-home";
import { getSiteContent, publishSiteContent, saveSiteDraft } from "@/lib/site-admin.functions";
import { MediaManager } from "@/components/admin/MediaManager";
import { uploadMedia } from "@/components/admin/upload";

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({ meta: [{ title: "Site content builder | Nerdy Pixels Academy Admin" }, { name: "robots", content: "noindex" }] }),
  component: Builder,
});

type Json = Record<string, any>;
const PHOTOS = ["hero-neon-1920", "hero-team-lagos-1920", "final-team-1920", "learners-1200", "outcomes-1200", "curriculum-1200", "tools-1200", "free-class-1200", "class-recording-1200", "persona-switcher-1200", "persona-graduate-1200", "persona-marketer-1200", "persona-owner-1200", "testimonial-1-1200", "testimonial-2-1200", "testimonial-3-1200"].map((n) => `/brand/photos/${n}.webp`);
const WIDTHS = { desktop: "100%", tablet: "820px", mobile: "390px" } as const;
// Pages the builder can edit. Add a key here (and its schema/defaults) to extend the builder to more pages.
const PAGES = [{ key: "home", label: "Homepage", path: "/" }] as const;

function Builder() {
  const getFn = useServerFn(getSiteContent), saveFn = useServerFn(saveSiteDraft), pubFn = useServerFn(publishSiteContent);
  const qc = useQueryClient();
  const page = PAGES[0];
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["site-content", page.key], queryFn: () => getFn({ data: { key: page.key } }) });
  const [draft, setDraft] = useState<Json | null>(null);
  const [open, setOpen] = useState<string>("hero");
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState<keyof typeof WIDTHS>("desktop");
  const [view, setView] = useState<"edit" | "preview">("edit"); // phones and tablets show one at a time
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => { if (data && !draft) { const saved = data.draft && Object.keys(data.draft as object).length ? data.draft : data.published; setDraft(mergeHome(saved) as Json); } }, [data, draft]);
  const send = useCallback((d: Json | null) => { try { frame.current?.contentWindow?.postMessage({ type: "npa-cms-preview", content: d }, location.origin); } catch { /* frame not ready */ } }, []);
  useEffect(() => { const t = setTimeout(() => send(draft), 200); return () => clearTimeout(t); }, [draft, send]);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.type === "npa-cms-ready") send(draft); };
    addEventListener("message", onMsg); return () => removeEventListener("message", onMsg);
  }, [draft, send]);
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } }; addEventListener("beforeunload", warn); return () => removeEventListener("beforeunload", warn); }, [dirty]);

  const update = (section: string, value: Json) => { setDraft((d) => ({ ...d!, [section]: value })); setDirty(true); };
  const publishedAt = data?.published_at ? new Date(data.published_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : null;
  const hasUnpublished = useMemo(() => !!data && JSON.stringify(mergeHome(data.published)) !== JSON.stringify(draft), [data, draft]);

  async function saveDraft() { if (!draft) return; setBusy(true); setMsg(""); try { await saveFn({ data: { key: page.key, draft } }); setDirty(false); setMsg("Draft saved. Visitors still see the published version."); qc.invalidateQueries({ queryKey: ["site-content", page.key] }); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }
  async function publish() { if (!draft) return; if (!confirm("Publish these changes to the live website?")) return; setBusy(true); setMsg(""); try { await pubFn({ data: { key: page.key, draft } }); setDirty(false); setMsg("Published. The live site shows these changes now."); await refetch(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }
  function discard() { if (!data || !confirm("Discard your unpublished changes and go back to the live version?")) return; setDraft(mergeHome(data.published) as Json); setDirty(false); setMsg("Back to the published version."); }
  function resetSection(id: string) { if (!confirm("Reset this section to the original design text?")) return; update(id, (HOME_DEFAULTS as Json)[id]); }

  if (isLoading || (!draft && !error)) return <p className="adm-empty">Loading the builder…</p>;
  if (error) return <div className="adm-card"><p>{(error as Error).message}</p></div>;

  return (
    <div className={`cms view-${view}`}>
      <div className="adm-head" style={{ marginBottom: 12 }}>
        <div><h1 style={{ marginBottom: 4 }}>Site content builder</h1><p className="sub" style={{ margin: 0 }}>Editing <b>{page.label}</b>. {publishedAt ? `Last published ${publishedAt}.` : "Not published yet: the site shows the original design."} {hasUnpublished && <span className="adm-pill pending">unpublished changes</span>}</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="adm-btn ghost" disabled={busy || !hasUnpublished} onClick={discard}><RotateCcw size={14} style={{ verticalAlign: -2 }} /> Discard</button>
          <button className="adm-btn ghost" disabled={busy || !dirty} onClick={saveDraft}>Save draft</button>
          <button className="adm-btn green" disabled={busy || !hasUnpublished} onClick={publish}>Publish</button>
        </div>
      </div>
      {msg && <div className="adm-card" role="status" style={{ marginBottom: 12, fontSize: 14 }}>{msg}</div>}
      <div className="cms-switch" role="tablist" aria-label="Builder view">
        <button type="button" role="tab" aria-selected={view === "edit"} className={view === "edit" ? "on" : ""} onClick={() => setView("edit")}>Edit</button>
        <button type="button" role="tab" aria-selected={view === "preview"} className={view === "preview" ? "on" : ""} onClick={() => { setView("preview"); setTimeout(() => send(draft), 60); }}>Preview</button>
      </div>
      <div className="cms-grid">
        <aside className="cms-panel">
          <p className="cms-tokens">Live values you can type in any text: {LIVE_TOKENS.map((t) => <code key={t}>{`{${t}}`}</code>)}. They fill in from Cohorts and Currencies, in the visitor's currency.</p>
          {HOME_SCHEMA.map((s) => {
            const val = (draft![s.id] ?? {}) as Json;
            const hidden = val["show"] === false;
            return (
              <section key={s.id} className={`cms-sec ${open === s.id ? "open" : ""}`}>
                <button type="button" className="cms-sec-head" onClick={() => setOpen(open === s.id ? "" : s.id)} aria-expanded={open === s.id}>
                  <span>{s.label}</span>{hidden ? <EyeOff size={15} aria-label="Hidden" /> : <Eye size={15} aria-label="Shown" />}
                </button>
                {open === s.id && (
                  <div className="cms-sec-body">
                    {s.help && <p className="sub" style={{ marginTop: 0 }}>{s.help}</p>}
                    {s.fields.map((f) => <FieldEditor key={f.key} field={f} value={val[f.key]} onChange={(v) => update(s.id, { ...val, [f.key]: v })} />)}
                    {s.id === "results" && <div className="cms-embed"><MediaManager kinds={["testimonial"]} /><button type="button" className="adm-btn ghost" onClick={() => frame.current?.contentWindow?.location.reload()}><RefreshCw size={14} style={{ verticalAlign: -2 }} /> Refresh preview after saving a testimonial</button></div>}
                    {s.id === "inside" && <div className="cms-embed"><MediaManager kinds={["class_recording"]} /></div>}
                    {s.id === "logos" && <div className="cms-embed"><MediaManager kinds={["logo"]} /></div>}
                    <button type="button" className="adm-btn ghost" style={{ marginTop: 10 }} onClick={() => resetSection(s.id)}>Reset section to original</button>
                  </div>
                )}
              </section>
            );
          })}
        </aside>
        <div className="cms-preview">
          <div className="cms-bar">
            <span className="sub" style={{ margin: 0 }}>Live preview (your draft)</span>
            <div style={{ display: "flex", gap: 4 }}>
              {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([k, Icon]) => <button key={k} type="button" className={`adm-btn ${width === k ? "" : "ghost"}`} style={{ padding: "6px 10px" }} onClick={() => setWidth(k)} aria-label={`${k} width`}><Icon size={15} /></button>)}
              <button type="button" className="adm-btn ghost" style={{ padding: "6px 10px" }} onClick={() => frame.current?.contentWindow?.location.reload()} aria-label="Reload preview"><RefreshCw size={15} /></button>
            </div>
          </div>
          <div className="cms-frame-wrap"><iframe ref={frame} title="Homepage preview" src={`${page.path}?cms=preview`} style={{ width: WIDTHS[width] }} onLoad={() => send(draft)} /></div>
        </div>
      </div>
      <div className="cms-mobilebar">
        <button className="adm-btn ghost" disabled={busy || !hasUnpublished} onClick={discard}><RotateCcw size={14} style={{ verticalAlign: -2 }} /> Discard</button>
        <button className="adm-btn ghost" disabled={busy || !dirty} onClick={saveDraft}>Save</button>
        <button className="adm-btn green" disabled={busy || !hasUnpublished} onClick={publish}>Publish</button>
      </div>
    </div>
  );
}

function FieldEditor({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  if (field.type === "toggle") return <label className="cms-toggle"><input type="checkbox" checked={value !== false} onChange={(e) => onChange(e.target.checked)} /> {field.label}</label>;
  if (field.type === "select") return <label className="cms-field">{field.label}<select className="adm-select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
  if (field.type === "textarea") return <label className="cms-field">{field.label}<textarea className="adm-input" rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
  if (field.type === "image") return <ImageField label={field.label} help={field.help} value={value ?? ""} onChange={onChange} />;
  if (field.type === "list") {
    const items: any[] = Array.isArray(value) ? value : [];
    const set = (i: number, v: any) => onChange(items.map((x, j) => (j === i ? v : x)));
    const move = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
    return (
      <div className="cms-list"><div className="cms-list-head"><b>{field.label}</b><span className="sub">{items.length}</span></div>
        {items.map((it, i) => (
          <div key={i} className="cms-item">
            <div className="cms-item-head"><span>{field.itemLabel} {i + 1}</span><span style={{ display: "flex", gap: 2 }}>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={14} /></button></span></div>
            {field.item.map((f) => <FieldEditor key={f.key} field={f} value={it?.[f.key]} onChange={(v) => set(i, { ...it, [f.key]: v })} />)}
          </div>
        ))}
        <button type="button" className="adm-btn ghost" onClick={() => onChange([...items, Object.fromEntries(field.item.map((f) => [f.key, f.type === "toggle" ? true : ""]))])}>Add {field.itemLabel.toLowerCase()}</button>
      </div>
    );
  }
  return <label className="cms-field">{field.label}<input className="adm-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function ImageField({ label, help, value, onChange }: { label: string; help?: string | undefined; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [pick, setPick] = useState(false);
  async function up(file?: File) { if (!file) return; setBusy(true); setErr(""); try { onChange((await uploadMedia(file, "images")).url); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }
  return (
    <div className="cms-field"><span>{label}</span>{help && <span className="sub" style={{ margin: 0 }}>{help}</span>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {value ? <img className="adm-thumb" src={value} alt="" /> : <span className="adm-thumb" style={{ display: "grid", placeItems: "center", fontSize: 11, color: "#6b6280" }}>none</span>}
        <label className="adm-btn ghost" style={{ padding: "6px 10px", cursor: "pointer" }}>{busy ? "Uploading…" : "Upload"}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => up(e.target.files?.[0])} /></label>
        <button type="button" className="adm-btn ghost" style={{ padding: "6px 10px" }} onClick={() => setPick(!pick)}>Choose a photo</button>
        {value && <button type="button" className="adm-btn ghost" style={{ padding: "6px 10px" }} onClick={() => onChange("")}>Remove</button>}
      </div>
      {pick && <div className="cms-gallery">{PHOTOS.map((p) => <button type="button" key={p} onClick={() => { onChange(p); setPick(false); }} className={p === value ? "on" : ""}><img src={p.replace(/-(1920|1200)\.webp$/, (m, w) => (w === "1920" ? "-960.webp" : "-640.webp"))} alt="" loading="lazy" /></button>)}</div>}
      <input className="adm-input" placeholder="…or paste an image link" value={value} onChange={(e) => onChange(e.target.value)} />
      {err && <span style={{ color: "#a11", fontSize: 12 }}>{err}</span>}
    </div>
  );
}
