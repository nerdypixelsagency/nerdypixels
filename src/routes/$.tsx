import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/site/SitePage";
import { headFor } from "@/site/meta";
import { getBlogData, blogDeps } from "@/lib/blog.functions";
import { getPublicCourseConfig } from "@/lib/course-config.functions";

export const Route = createFileRoute("/$")({
  loaderDeps: ({ search }) => blogDeps(search as Record<string, unknown>),
  loader: async ({ params, deps }) => {
    const path = "/" + (params._splat ?? "");
    const [blog, config] = await Promise.all([/^\/blog(\/|$)/.test(path) ? getBlogData({ data: { path, ...deps } }) : Promise.resolve(null), getPublicCourseConfig()]);
    return { blog, config };
  },
  head: ({ params, loaderData }) => headFor("/" + (params._splat ?? ""), loaderData?.blog, loaderData?.config),
  component: SplatPage,
});

function SplatPage() {
  const data = Route.useLoaderData();
  return <SitePage blog={data.blog} config={data.config} />;
}
