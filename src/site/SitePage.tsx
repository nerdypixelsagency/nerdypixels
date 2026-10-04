import { useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef } from "react";
import { startPayment, registerEvent, submitLead } from "@/lib/payments.functions";
const astronaut = { url: "/brand/astronaut.png" };
// @ts-expect-error plain JS site bundle
import { renderStatic, boot, renderNow, primeBlog } from "./app.js";
import type { BlogData } from "@/lib/blog.functions";
import "./site.css";
import "./brand.css";
import "./premium.css";

export function SitePage({ blog = null }: { blog?: BlogData | null } = {}) {
  const router = useRouter();
  const loc = useRouterState({ select: (s) => s.location });
  const pay = useServerFn(startPayment);
  const event = useServerFn(registerEvent);
  const lead = useServerFn(submitLead);
  const initialPageView = useRef(true);
  // Server-rendered HTML so crawlers see full page content without running JS.
  primeBlog(blog);
  const html = useMemo(() => renderStatic(loc.pathname, loc.searchStr).html as string, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Old "#/path" links keep working.
    if (location.hash.startsWith("#/")) {
      const target = location.hash.slice(1);
      const targetUrl = new URL(target, location.origin);
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
        if (!targetUrl.searchParams.has(key)) {
          const value = new URLSearchParams(location.search).get(key);
          if (value) targetUrl.searchParams.set(key, value);
        }
      }
      const preservedTarget = targetUrl.pathname + targetUrl.search + targetUrl.hash;
      history.replaceState(null, "", preservedTarget);
      router.navigate({ href: preservedTarget, replace: true });
    }
    const w = window as unknown as Record<string, unknown>;
    w["__npaPay"] = (d: unknown) => pay({ data: d as never });
    w["__npaEvent"] = (d: { name: string; email: string; phone?: string }) =>
      event({ data: { name: d.name, email: d.email, phone: d.phone } });
    w["__npaLead"] = (d: unknown) => lead({ data: d as never });
    w["__npaNav"] = (href: string) => router.navigate({ href });
    document.documentElement.style.setProperty("--astro", `url(${astronaut.url})`);
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    primeBlog(blog);
    renderNow();
    if (initialPageView.current) {
      initialPageView.current = false;
      return;
    }
    const analyticsWindow = window as Window & { gtag?: (...args: unknown[]) => void };
    if (typeof analyticsWindow.gtag === "function") {
      analyticsWindow.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: location.href,
        page_title: document.title,
      });
    }
  }, [loc.href, blog]);

  return <div id="app" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
