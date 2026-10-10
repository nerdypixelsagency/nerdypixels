import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/site/SitePage";
import { headFor } from "@/site/meta";
import { getBlogData } from "@/lib/blog.functions";
import { getPublicCourseConfig } from "@/lib/course-config.functions";
import { getVisitorGeo } from "@/lib/payments.functions";

// Country only matters for the first, server-rendered paint; the browser keeps it afterwards.
const geoOnServer = async () => (typeof window === "undefined" ? (await getVisitorGeo().catch(() => ({ country: null }))).country : null);

export const Route = createFileRoute("/")({
  loader: async () => { const [blog, config, geo] = await Promise.all([getBlogData({ data: { path: "/" } }), getPublicCourseConfig(), geoOnServer()]); return { blog, config, geo }; },
  head: ({ loaderData }) => headFor("/", loaderData?.blog, loaderData?.config),
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData();
  return <SitePage blog={data.blog} config={data.config} geo={data.geo} />;
}
