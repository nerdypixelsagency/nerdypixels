import { createFileRoute } from "@tanstack/react-router";
import { Student } from "@/site/StudentArea";

export const Route = createFileRoute("/student")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Student area | Nerdy Pixels Academy" },
      { name: "description", content: "See your Nerdy Pixels Academy payments and pay your next instalment." },
      { property: "og:title", content: "Student area | Nerdy Pixels Academy" },
      { property: "og:description", content: "See your payments and pay your next instalment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Student,
});
