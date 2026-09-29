import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/site/SitePage";
import { headFor } from "@/site/meta";
import { getBlogData } from "@/lib/blog.functions";

export const Route = createFileRoute("/")({
  loader: () => getBlogData({ data: { path: "/" } }),
  head: () => headFor("/"),
  component: HomePage,
});

function HomePage() {
  return <SitePage blog={Route.useLoaderData()} />;
}
