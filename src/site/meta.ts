export const SITE_URL = "https://bootcamp.npdacademy.com";
export const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

type Meta = { title: string; description: string; noindex?: boolean; type?: string };

const M: Record<string, Meta> = {
  "/": {
    title: "Nerdy Pixels Academy | Digital Marketing Bootcamp in Nigeria",
    description:
      "Practical digital marketing training for Africa's emerging workforce. Five certifications, eight portfolio projects and live classes. Next cohort starts 5 November 2026.",
  },
  "/courses": {
    title: "Digital Marketing Courses | Nerdy Pixels Academy",
    description: "Browse Nerdy Pixels Academy courses: the Professional Digital Marketing Bootcamp and upcoming programmes for Africa's emerging workforce.",
  },
  "/courses/digital-marketing": {
    title: "Professional Digital Marketing Bootcamp | Nerdy Pixels Academy",
    description:
      "12-week live digital marketing bootcamp: SEO, social media, paid ads, analytics and content. ₦60,000 early bird or ₦40,000 monthly. Certified, with a portfolio.",
    type: "product",
  },
  "/curriculum": {
    title: "Bootcamp Curriculum: 8 Modules | Nerdy Pixels Academy",
    description: "See all eight modules of the Digital Marketing Bootcamp, the projects you build and the certifications you earn.",
  },
  "/faq": {
    title: "Frequently Asked Questions | Nerdy Pixels Academy",
    description: "Answers about the bootcamp schedule, payments, instalments, certifications, referral codes and what you need to start.",
  },
  "/blog": {
    title: "Digital Marketing Blog | Nerdy Pixels Academy",
    description: "Practical guides on marketing strategy, social media, SEO and building a digital marketing career in Africa.",
  },
  "/blog/first-marketing-strategy": {
    title: "How to Write Your First Marketing Strategy | Nerdy Pixels Academy",
    description: "A marketing strategy does not need to be a 40-page document. For most businesses one clear page is enough. Here is how to write it.",
    type: "article",
  },
  "/events/first-marketing-strategy": {
    title: "Free Live Class: Creating Your First Marketing Strategy | Nerdy Pixels Academy",
    description: "Join our free live online class on Saturday 10 October 2026, 11:00 AM WAT. Register with your WhatsApp number to get the joining link.",
  },
  "/contact": {
    title: "Contact Nerdy Pixels Academy",
    description: "Questions about the bootcamp, payments or your student profile? Message Nerdy Pixels Academy on WhatsApp or email info@npdacademy.com.",
  },
  "/payment-policy": { title: "Payment Policy | Nerdy Pixels Academy", description: "How payments, instalments, refunds and early-bird pricing work at Nerdy Pixels Academy." },
  "/privacy": { title: "Privacy Policy | Nerdy Pixels Academy", description: "How Nerdy Pixels Academy collects, uses and protects your personal information." },
  "/terms": { title: "Terms of Service | Nerdy Pixels Academy", description: "The terms that apply when you use the Nerdy Pixels Academy website and enrol in a programme." },
  "/checkout": { title: "Enrol: Checkout | Nerdy Pixels Academy", description: "Secure your seat in the Digital Marketing Bootcamp.", noindex: true },
  "/onboarding": { title: "Student Onboarding | Nerdy Pixels Academy", description: "Your next steps after enrolling.", noindex: true },
  "/pay-instalment": { title: "Pay an Instalment | Nerdy Pixels Academy", description: "Pay your monthly bootcamp instalment securely.", noindex: true },
};

export function metaFor(path: string): Meta {
  const p = path.replace(/\/+$/, "") || "/";
  return M[p] ?? { title: "Nerdy Pixels Academy", description: M["/"].description, noindex: true };
}

const FAQ = [
  ["When does the next cohort start?", "Classes start on Thursday 5 November 2026 and run live online."],
  ["How much does the bootcamp cost?", "₦60,000 when you pay once before 10 October 2026 (early bird), or ₦40,000 per month in equal monthly instalments due on the 1st of every month."],
  ["Do I get certified?", "Yes. You work towards five industry certifications and build eight portfolio projects."],
  ["Can I use a referral code?", "Yes. Enter your ambassador's referral code at checkout and it is attached to your payment and receipt."],
];

export function jsonLdFor(path: string) {
  const p = path.replace(/\/+$/, "") || "/";
  const org = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Nerdy Pixels Academy",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    email: "info@npdacademy.com",
    telephone: "+2349136713644",
    areaServed: "Africa",
  };
  const out: object[] = [];
  if (p === "/") out.push(org);
  if (p === "/" || p === "/courses/digital-marketing" || p === "/curriculum")
    out.push({
      "@context": "https://schema.org",
      "@type": "Course",
      name: "Professional Digital Marketing Bootcamp",
      description: M["/courses/digital-marketing"].description,
      provider: { "@type": "Organization", name: "Nerdy Pixels Academy", sameAs: SITE_URL },
      offers: [
        { "@type": "Offer", price: 60000, priceCurrency: "NGN", category: "Early bird, pay once" },
        { "@type": "Offer", price: 40000, priceCurrency: "NGN", category: "Monthly instalment" },
      ],
      hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", startDate: "2026-11-05" },
    });
  if (p === "/faq" || p === "/courses/digital-marketing")
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    });
  if (p === "/events/first-marketing-strategy")
    out.push({
      "@context": "https://schema.org",
      "@type": "Event",
      name: "Creating Your First Marketing Strategy",
      startDate: "2026-10-10T11:00:00+01:00",
      endDate: "2026-10-10T12:00:00+01:00",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      location: { "@type": "VirtualLocation", url: `${SITE_URL}${p}` },
      isAccessibleForFree: true,
      organizer: { "@type": "Organization", name: "Nerdy Pixels Academy", url: SITE_URL },
    });
  if (p.startsWith("/blog/"))
    out.push({ "@context": "https://schema.org", "@type": "Article", headline: M[p]?.title, author: { "@type": "Organization", name: "Nerdy Pixels Academy" } });
  if (p !== "/") {
    const parts = p.split("/").filter(Boolean);
    out.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }].concat(
        parts.map((seg, i) => ({ "@type": "ListItem", position: i + 2, name: seg.replace(/-/g, " "), item: `${SITE_URL}/${parts.slice(0, i + 1).join("/")}` })),
      ),
    });
  }
  return out;
}

export function headFor(path: string) {
  const m = metaFor(path);
  const p = path.replace(/\/+$/, "") || "/";
  const url = `${SITE_URL}${p === "/" ? "/" : p}`;
  const meta: Record<string, string>[] = [
    { title: m.title },
    { name: "description", content: m.description },
    { property: "og:title", content: m.title },
    { property: "og:description", content: m.description },
    { property: "og:type", content: m.type === "article" ? "article" : "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "Nerdy Pixels Academy" },
    { property: "og:image", content: OG_IMAGE },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: m.title },
    { name: "twitter:description", content: m.description },
    { name: "twitter:image", content: OG_IMAGE },
  ];
  if (m.noindex) meta.push({ name: "robots", content: "noindex, follow" });
  return {
    meta,
    links: m.noindex ? [] : [{ rel: "canonical", href: url }],
    scripts: jsonLdFor(p).map((j) => ({ type: "application/ld+json", children: JSON.stringify(j) })),
  };
}
