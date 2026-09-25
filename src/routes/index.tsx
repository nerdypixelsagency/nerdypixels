import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import "../site/site.css";
import "../site/brand.css";
import logoDark from "@/assets/logo-dark.png.asset.json";
import logoLight from "@/assets/logo-light.png.asset.json";
import astronaut from "@/assets/astronaut.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nerdy Pixels Academy | Digital Marketing Bootcamp" },
      {
        name: "description",
        content:
          "Practical digital marketing training for Africa's emerging workforce. Five certifications, eight portfolio projects and live classes.",
      },
      { property: "og:title", content: "Nerdy Pixels Academy | Digital Marketing Bootcamp" },
      {
        property: "og:description",
        content: "Become a job-ready digital marketer. Certified, with a portfolio to prove it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

let started = false;

function Index() {
  useEffect(() => {
    (window as unknown as { __resources: Record<string, string> }).__resources = {
      logoDark: logoDark.url,
      logoLight: logoLight.url,
    };
    document.documentElement.style.setProperty("--astro", `url(${astronaut.url})`);
    if (!started) {
      started = true;
      // @ts-expect-error plain JS site bundle
      import("../site/app.js");
    }
  }, []);
  return <div id="app" />;
}
