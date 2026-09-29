import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://bootcamp.npdacademy.com";
const STATIC = ["/", "/courses", "/courses/digital-marketing", "/curriculum", "/faq", "/blog", "/events/first-marketing-strategy", "/contact", "/payment-policy", "/privacy", "/terms"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = STATIC.map((p) => `<url><loc>${SITE}${p}</loc></url>`);
        try {
          const { wpListPosts } = await import("@/lib/wordpress.server");
          for (let page = 1; page <= 10; page++) {
            const r = await wpListPosts({ page, perPage: 100 });
            r.posts.forEach((p) => urls.push(`<url><loc>${SITE}/blog/${encodeURIComponent(p.slug)}</loc><lastmod>${p.dateIso.slice(0, 10)}</lastmod></url>`));
            if (page >= r.totalPages) break;
          }
        } catch (e) {
          console.error("Sitemap blog fetch failed", e);
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
      },
    },
  },
});
