import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/site/SitePage";
import { headFor } from "@/site/meta";
import { getBlogData, blogDeps } from "@/lib/blog.functions";
import { getPublicCourseConfig } from "@/lib/course-config.functions";
import { getVisitorGeo } from "@/lib/payments.functions";

// Country only matters for the first, server-rendered paint; the browser keeps it afterwards.
const geoOnServer = async () => (typeof window === "undefined" ? (await getVisitorGeo().catch(() => ({ country: null }))).country : null);

export const Route = createFileRoute("/$")({
  loaderDeps: ({ search }) => blogDeps(search as Record<string, unknown>),
  loader: async ({ params, deps }) => {
    const path = "/" + (params._splat ?? "");
    const [blog, config, geo] = await Promise.all([/^\/blog(\/|$)/.test(path) ? getBlogData({ data: { path, ...deps } }) : Promise.resolve(null), getPublicCourseConfig(), geoOnServer()]);
    return { blog, config, geo };
  },
  head: ({ params, loaderData }) => headFor("/" + (params._splat ?? ""), loaderData?.blog, loaderData?.config),
  component: SplatPage,
});

function SplatPage() {
  const data = Route.useLoaderData();
  return <SitePage blog={data.blog} config={data.config} geo={data.geo} />;
}
