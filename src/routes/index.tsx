import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { startPayment, registerEvent } from "@/lib/payments.functions";
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
  const pay = useServerFn(startPayment);
  const event = useServerFn(registerEvent);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w["__resources"] = { logoDark: logoDark.url, logoLight: logoLight.url };
    w["__npaPay"] = (d: unknown) => pay({ data: d as never });
    w["__npaEvent"] = (d: { name: string; email: string; phone?: string }) =>
      event({ data: { name: d.name, email: d.email, phone: d.phone } });
    document.documentElement.style.setProperty("--astro", `url(${astronaut.url})`);
    if (!started) {
      started = true;
      // @ts-expect-error plain JS site bundle
      import("../site/app.js");
    }
  }, []);
  return <div id="app" />;
}
