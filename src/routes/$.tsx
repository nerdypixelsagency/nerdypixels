import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/site/SitePage";
import { headFor } from "@/site/meta";
import { getBlogData, blogDeps } from "@/lib/blog.functions";

export const Route = createFileRoute("/$")({
  loaderDeps: ({ search }) => blogDeps(search as Record<string, unknown>),
  loader: ({ params, deps }) => {
    const path = "/" + (params._splat ?? "");
    if (!/^\/blog(\/|$)/.test(path)) return null;
    return getBlogData({ data: { path, ...deps } });
  },
  head: ({ params, loaderData }) => headFor("/" + (params._splat ?? ""), loaderData),
  component: SplatPage,
});

function SplatPage() {
  return <SitePage blog={Route.useLoaderData()} />;
}
