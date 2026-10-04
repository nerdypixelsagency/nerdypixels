import { CalendarDays, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";

export function FilterToolbar({ search, onSearch, placeholder, children, from, to, onFrom, onTo, active, onReset }: { search: string; onSearch: (v: string) => void; placeholder: string; children?: ReactNode; from?: string; to?: string; onFrom?: (v: string) => void; onTo?: (v: string) => void; active?: boolean; onReset?: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="adm-toolbar">
    <label className="adm-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search</span><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} /></label>
    <button className="adm-filter-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open}><SlidersHorizontal size={17} /> Filters</button>
    <div className={`adm-toolbar-fields ${open ? "open" : ""}`}>{children}{onFrom && onTo && <div className="adm-date-range"><CalendarDays size={16} aria-hidden="true" /><input type="date" aria-label="From date" value={from} onChange={(e) => onFrom(e.target.value)} /><span>–</span><input type="date" aria-label="To date" value={to} onChange={(e) => onTo(e.target.value)} /></div>}{active && onReset && <button className="adm-reset" type="button" onClick={onReset} title="Clear filters"><RotateCcw size={16} /> Reset</button>}</div>
  </div>;
}