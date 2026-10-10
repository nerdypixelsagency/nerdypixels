import { useRouter, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo } from "react";
import { startPayment, registerEvent, submitLead, requestSyllabus, getVisitorGeo } from "@/lib/payments.functions";
import { validateReferralCode } from "@/lib/referrals.functions";
const astronaut = { url: "/brand/astronaut.webp" };
// @ts-expect-error plain JS site bundle
import { renderStatic, boot, renderNow, primeBlog, primeCourseConfig, primeGeo } from "./app.js";
import type { BlogData } from "@/lib/blog.functions";
import type { CourseConfig } from "@/lib/course-config.functions";
import "./site.css";
import "./brand.css";
import "./premium.css";
import "./home.css";

export function SitePage({ blog = null, config, geo = null }: { blog?: BlogData | null; config?: CourseConfig; geo?: string | null } = {}) {
  const router = useRouter();
  const loc = useRouterState({ select: (s) => s.location });
  const pay = useServerFn(startPayment);
  const event = useServerFn(registerEvent);
  const lead = useServerFn(submitLead);
  const syllabus = useServerFn(requestSyllabus);
  const geoFn = useServerFn(getVisitorGeo);
  const refCheck = useServerFn(validateReferralCode);
  // Server-rendered HTML so crawlers see full page content without running JS.
  primeBlog(blog);
  primeCourseConfig(config);
  primeGeo(geo);
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
    w["__npaEvent"] = (d: { name: string; email: string; phone?: string; persona?: string }) =>
      event({ data: { name: d.name, email: d.email, phone: d.phone, persona: d.persona } });
    w["__npaLead"] = (d: unknown) => lead({ data: d as never });
    w["__npaSyllabus"] = (d: unknown) => syllabus({ data: d as never });
    w["__npaRefCheck"] = (d: { code: string }) => refCheck({ data: d });
    w["__npaNav"] = (href: string) => {
      const target = new URL(href, location.origin);
      const current = new URLSearchParams(location.search);
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
        if (!target.searchParams.has(key)) {
          const value = current.get(key);
          if (value) target.searchParams.set(key, value);
        }
      }
      router.navigate({ href: target.pathname + target.search + target.hash });
    };
    document.documentElement.style.setProperty("--astro", `url(${astronaut.url})`);
    // The country decides the default currency; cached for the session so it is looked up once.
    let cached: string | null = null;
    try { cached = sessionStorage.getItem("npa-geo"); } catch { /* private mode */ }
    if (geo || cached) primeGeo(geo || cached);
    boot();
    if (!geo && !cached)
      geoFn()
        .then((r) => {
          if (!r.country) return;
          try { sessionStorage.setItem("npa-geo", r.country); } catch { /* ignore */ }
          primeGeo(r.country);
        })
        .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    primeBlog(blog);
    primeCourseConfig(config);
    renderNow();
  }, [loc.href, blog, config]);

  return <div id="app" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
