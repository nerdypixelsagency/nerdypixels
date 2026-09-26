import { useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo } from "react";
import { startPayment, registerEvent } from "@/lib/payments.functions";
const astronaut = { url: "/brand/astronaut.png" };
// @ts-expect-error plain JS site bundle
import { renderStatic, boot, renderNow } from "./app.js";
import "./site.css";
import "./brand.css";
import "./premium.css";

export function SitePage() {
  const router = useRouter();
  const loc = useRouterState({ select: (s) => s.location });
  const pay = useServerFn(startPayment);
  const event = useServerFn(registerEvent);
  // Server-rendered HTML so crawlers see full page content without running JS.
  const html = useMemo(() => renderStatic(loc.pathname, loc.searchStr).html as string, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Old "#/path" links keep working.
    if (location.hash.startsWith("#/")) {
      const target = location.hash.slice(1);
      history.replaceState(null, "", target);
      router.navigate({ href: target, replace: true });
    }
    const w = window as unknown as Record<string, unknown>;
    w["__npaPay"] = (d: unknown) => pay({ data: d as never });
    w["__npaEvent"] = (d: { name: string; email: string; phone?: string }) =>
      event({ data: { name: d.name, email: d.email, phone: d.phone } });
    w["__npaNav"] = (href: string) => router.navigate({ href });
    document.documentElement.style.setProperty("--astro", `url(${astronaut.url})`);
    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    renderNow();
  }, [loc.href]);

  return <div id="app" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
