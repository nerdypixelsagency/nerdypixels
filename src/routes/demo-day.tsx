import { createFileRoute } from "@tanstack/react-router";
// Standalone landing page served as its own HTML document, outside the site shell
// (no shared header or footer). Content lives in src/content/demo-day-landing.html,
// a self-contained bundle with the site logo swapped in.
import html from "@/content/demo-day-landing.html?raw";

export const Route = createFileRoute("/demo-day")({
  server: {
    handlers: {
      GET: async () =>
        new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "public, max-age=600, s-maxage=3600",
          },
        }),
    },
  },
});
