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
let healthy: { ok: boolean; at: number } | null = null;
async function backendHealthy() {
  if (healthy && Date.now() - healthy.at < 5 * 60_000) return healthy.ok;
  const u = process.env["SUPABASE_URL"];
  const k = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  const hasFlw = !!(process.env["FLW_SECRET_KEY"] || process.env["FLW_TEST_SECRET_KEY"]);
  let ok = false;
  if (u && k && hasFlw) {
    try {
      const r = await fetch(`${u}/rest/v1/app_settings?select=key&limit=1`, { headers: { apikey: k, Authorization: `Bearer ${k}` } });
      ok = r.ok;
      if (!ok) console.error("Backend health check failed", r.status);
    } catch (e) {
      console.error("Backend health check error", e);
    }
  } else console.error("Backend env incomplete; relaying");
  healthy = { ok, at: Date.now() };
  return ok;
}
const relayMiddleware = createMiddleware().server(async ({ request, next }) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/_serverFn") || url.origin === RELAY_TARGET || url.hostname === "localhost" || url.hostname.endsWith(".lovable.app")) return next();
  if (await backendHealthy()) return next();
  const headers = new Headers(request.headers);
  headers.set("origin", RELAY_TARGET);
  headers.set("referer", `${RELAY_TARGET}/`);
  headers.set("x-npa-origin", url.origin);
  headers.delete("host");
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const init: RequestInit = { method: request.method, headers };
  if (body) init.body = body;
  const res = await fetch(`${RELAY_TARGET}${url.pathname}${url.search}`, init);
  return new Response(res.body, { status: res.status, headers: res.headers }) as never;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [relayMiddleware, errorMiddleware, csrfMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
