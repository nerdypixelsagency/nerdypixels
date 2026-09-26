import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "./integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// Self-healing relay: deployments that lack the backend settings (e.g. the
// Vercel custom-domain copy) forward server-function calls to the fully
// configured Lovable deployment.
const RELAY_TARGET = "https://nerdypixels.lovable.app";
const relayMiddleware = createMiddleware().server(async ({ request, next }) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/_serverFn") || process.env["SUPABASE_URL"] || url.origin === RELAY_TARGET) return next();
  const headers = new Headers(request.headers);
  headers.set("origin", RELAY_TARGET);
  headers.set("referer", `${RELAY_TARGET}/`);
  headers.delete("host");
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const res = await fetch(`${RELAY_TARGET}${url.pathname}${url.search}`, { method: request.method, headers, body });
  return new Response(res.body, { status: res.status, headers: res.headers }) as never;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [relayMiddleware, errorMiddleware, csrfMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
