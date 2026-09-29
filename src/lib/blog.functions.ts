import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  path: z.string().max(300),
  page: z.number().int().min(1).max(500).optional(),
  cat: z.number().int().min(1).optional(),
  search: z.string().max(100).optional(),
});

// Public, read-only: published WordPress posts shaped for the site pages.
export const getBlogData = createServerFn({ method: "GET" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const { wpListPosts, wpCategories, wpPost } = await import("./wordpress.server");
    const path = data.path.replace(/\/+$/, "") || "/";
    try {
      if (path === "/") {
        const r = await wpListPosts({ perPage: 3 });
        return { kind: "home" as const, latest: r.posts };
      }
      if (path === "/blog") {
        const page = data.page ?? 1;
        const [list, cats] = await Promise.all([
          wpListPosts({ page, category: data.cat, search: data.search }),
          wpCategories().catch(() => []),
        ]);
        return { kind: "list" as const, list: { ...list, page }, cats, cat: data.cat ?? null, search: data.search ?? "" };
      }
      const m = path.match(/^\/blog\/([^/]+)$/);
      if (m) {
        const slug = decodeURIComponent(m[1]);
        const post = await wpPost(slug);
        let related: Awaited<ReturnType<typeof wpListPosts>>["posts"] = [];
        if (post) {
          related = (await wpListPosts({ perPage: 3, category: post.categoryId ?? undefined, exclude: post.id }).catch(() => ({ posts: [] }))).posts;
          if (!related.length) related = (await wpListPosts({ perPage: 3, exclude: post.id }).catch(() => ({ posts: [] }))).posts;
        }
        return { kind: "post" as const, slug, post, related };
      }
      return null;
    } catch (e) {
      console.error("Blog fetch failed", e);
      return { kind: "error" as const, path, error: "We couldn't load the blog right now." };
    }
  });

export type BlogData = Awaited<ReturnType<typeof getBlogData>>;

export function blogDeps(search: Record<string, unknown>) {
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isInteger(x) && x > 0 ? x : undefined;
  };
  const s = typeof search["search"] === "string" ? (search["search"] as string).slice(0, 100) : typeof search["search"] === "number" ? String(search["search"]) : undefined;
  return { page: n(search["page"]), cat: n(search["cat"]), search: s || undefined };
}
