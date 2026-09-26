import { createFileRoute } from "@tanstack/react-router";
import { SitePage } from "@/site/SitePage";
import { headFor } from "@/site/meta";

export const Route = createFileRoute("/$")({
  head: ({ params }) => headFor("/" + (params._splat ?? "")),
  component: SitePage,
});
