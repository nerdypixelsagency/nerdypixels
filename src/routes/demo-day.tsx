import { createFileRoute } from "@tanstack/react-router";
// Standalone landing page served as its own HTML document, outside the site shell
// (no shared header or footer). Content lives in src/content/demo-day.html.
import html from "@/content/demo-day.html?raw";

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
