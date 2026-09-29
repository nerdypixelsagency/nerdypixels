import sanitizeHtml from "sanitize-html";

// Single source of truth for all blog content.
export const WP_BASE = "https://blog.npdacademy.com/wp-json/wp/v2";
export const PER_PAGE = 12;

export type BlogCard = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  dateIso: string;
  author: string;
  category: string;
  categoryId: number | null;
  image: string | null;
  imageAlt: string;
};
export type BlogPost = BlogCard & { content: string; modifiedIso: string };
export type BlogCategory = { id: number; name: string; slug: string; count: number };

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 60_000;

async function wp<T>(path: string): Promise<{ data: T; totalPages: number; total: number }> {
  const key = path;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as { data: T; totalPages: number; total: number };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${WP_BASE}${path}`, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`WordPress request failed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as T;
    const value = {
      data,
      totalPages: Number(res.headers.get("x-wp-totalpages") || 1),
      total: Number(res.headers.get("x-wp-total") || 0),
    };
    cache.set(key, { at: Date.now(), value });
    return value;
  } finally {
    clearTimeout(timer);
  }
}

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#?[a-z0-9]+;/gi, (m) => ({ "&lt;": "<", "&gt;": ">", "&hellip;": "…", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”", "&ndash;": "–", "&mdash;": "—" })[m] ?? m);
const text = (html: string) => decode(sanitizeHtml(html || "", { allowedTags: [], allowedAttributes: {} })).replace(/\s+/g, " ").trim();

const fmt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso + "Z"));
  } catch {
    return iso.slice(0, 10);
  }
};

function safeContent(html: string) {
  return sanitizeHtml(html || "", {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "figure", "figcaption", "iframe", "h1", "h2", "picture", "source", "video"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel", "title"],
      img: ["src", "srcset", "sizes", "alt", "width", "height", "loading"],
      source: ["srcset", "type", "media"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "title"],
      video: ["src", "controls", "poster", "width", "height"],
      "*": ["id"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs["href"] || "";
        // Internal WordPress links stay on this site.
        const m = href.match(/^https?:\/\/blog\.npdacademy\.com\/([a-z0-9-%]+)\/?$/i);
        if (m) return { tagName: "a", attribs: { href: `/blog/${m[1]}` } };
        const ext = /^https?:\/\//i.test(href);
        return { tagName: "a", attribs: ext ? { href, target: "_blank", rel: "noopener noreferrer" } : { href } };
      },
      img: (tag, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: "lazy" } }),
    },
  });
}

type RawPost = {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content?: { rendered: string };
  categories?: number[];
  _embedded?: {
    author?: { name?: string }[];
    "wp:featuredmedia"?: { source_url?: string; alt_text?: string }[];
    "wp:term"?: { id: number; name: string; taxonomy: string }[][];
  };
};

function card(p: RawPost): BlogCard {
  const media = p._embedded?.["wp:featuredmedia"]?.[0];
  const cat = (p._embedded?.["wp:term"] ?? []).flat().find((t) => t?.taxonomy === "category");
  return {
    id: p.id,
    slug: p.slug,
    title: text(p.title?.rendered) || "Untitled",
    excerpt: text(p.excerpt?.rendered).slice(0, 220),
    date: fmt(p.date),
    dateIso: p.date,
    author: p._embedded?.author?.[0]?.name || "Nerdy Pixels Academy",
    category: cat && cat.name !== "Uncategorized" ? decode(cat.name) : "",
    categoryId: cat?.id ?? p.categories?.[0] ?? null,
    image: media?.source_url && /^https:\/\//.test(media.source_url) ? media.source_url : null,
    imageAlt: media?.alt_text || "",
  };
}

export async function wpListPosts(opts: { page?: number | undefined; category?: number | undefined; search?: string | undefined; perPage?: number | undefined; exclude?: number | undefined }) {
  const q = new URLSearchParams({ _embed: "1", per_page: String(Math.min(opts.perPage ?? PER_PAGE, 100)), page: String(opts.page ?? 1) });
  if (opts.category) q.set("categories", String(opts.category));
  if (opts.search) q.set("search", opts.search);
  if (opts.exclude) q.set("exclude", String(opts.exclude));
  try {
    const r = await wp<RawPost[]>(`/posts?${q}`);
    return { posts: r.data.map(card), totalPages: r.totalPages, total: r.total };
  } catch (e) {
    // WordPress returns 400 for a page beyond the last one.
    if (String(e).includes("[400]")) return { posts: [], totalPages: 0, total: 0 };
    throw e;
  }
}

export async function wpCategories(): Promise<BlogCategory[]> {
  const r = await wp<{ id: number; name: string; slug: string; count: number }[]>(`/categories?per_page=100`);
  return r.data.filter((c) => c.count > 0 && c.slug !== "uncategorized").map((c) => ({ id: c.id, name: decode(c.name), slug: c.slug, count: c.count }));
}

export async function wpPost(slug: string): Promise<BlogPost | null> {
  const r = await wp<RawPost[]>(`/posts?slug=${encodeURIComponent(slug)}&_embed=1`);
  const p = r.data[0];
  if (!p) return null;
  return { ...card(p), content: safeContent(p.content?.rendered ?? ""), modifiedIso: p.modified };
}
