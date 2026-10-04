import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/site/SitePage";
import { headFor } from "@/site/meta";
import { getBlogData } from "@/lib/blog.functions";
import { getPublicCourseConfig } from "@/lib/course-config.functions";

export const Route = createFileRoute("/")({
  loader: async () => ({ blog: await getBlogData({ data: { path: "/" } }), config: await getPublicCourseConfig() }),
  head: ({ loaderData }) => headFor("/", loaderData?.blog, loaderData?.config),
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData();
  return <SitePage blog={data.blog} config={data.config} />;
}
