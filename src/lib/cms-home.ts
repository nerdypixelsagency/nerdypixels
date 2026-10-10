// Homepage content: the defaults the site ships with and the schema the admin builder edits.
// Published edits (site_content.key = "home") are merged over these defaults section by section,
// so a new field added here shows up on the site straight away, even before anyone edits it.
//
// Text can use live tokens that the site fills in from the backend, in the visitor's currency:
//   {deposit} {early} {earlyBalance} {monthly} {monthlyFirst} {monthlyTotal} {save}
//   {startDate} {earlyDeadline} {balanceDue} {seatsLeft} {seatLimit} {freeClassDate}
//
// Photos are from Pexels (free licence), stored as WebP in /brand/photos.

export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "image" | "url"; help?: string }
  | { key: string; label: string; type: "toggle"; help?: string }
  | { key: string; label: string; type: "select"; options: [string, string][]; help?: string }
  | { key: string; label: string; type: "list"; item: Field[]; itemLabel: string; help?: string };
export type Section = { id: string; label: string; help?: string; fields: Field[] };

export const LIVE_TOKENS = ["deposit", "early", "earlyBalance", "monthly", "monthlyFirst", "monthlyTotal", "save", "startDate", "earlyDeadline", "balanceDue", "seatsLeft", "seatLimit", "freeClassDate"] as const;

const photo = (n: string) => `/brand/photos/${n}-1200.webp`;

export const HOME_DEFAULTS = {
  offer: { showSeats: true },
  hero: {
    show: true,
    kicker: "Next cohort starts {startDate}",
    title: "Start 2027 as an",
    accent: "AI-powered digital marketer.",
    lead: "A live, practical bootcamp taught by marketers who do the work every day. Learn SEO, ads, social and analytics, and the AI tools that make you faster. Eight modules, five certifications and a real brand project for your portfolio.",
    secondary: "Not ready? Join the free class first →",
    trust: [{ text: "Fully refundable for 7 days" }, { text: "{deposit} counts toward your fee" }, { text: "Pay from anywhere in the world" }],
    image: "/brand/photos/hero-neon-1920.webp",
  },
  logos: { show: true, label: "Our alumni have worked at" },
  stats: {
    show: true,
    items: [
      { value: "1,000+", label: "alumni in our network", live: "" },
      { value: "{seatsLeft}", label: "early-bird seats left", live: "seats_left" },
      { value: "", label: "days until classes start", live: "days_to_start" },
      { value: "5", label: "certifications each", live: "" },
    ],
  },
  results: {
    show: true,
    eyebrow: "Results",
    title: "With 1,000+ alumni network, here is what some of our Nerds have to say",
    lead: "Our last cohort built real campaigns for startup brands and a LIVE digital product in a hackathon.",
    strip: [{ value: "30", label: "graduates" }, { value: "8", label: "industry tracks in the hackathon" }, { value: "5", label: "certifications each" }],
  },
  problems: {
    show: true,
    eyebrow: "Why people get stuck",
    title: "Talent is not what keeps people out of marketing. A system is.",
    lead: "Most people who try to learn digital marketing on their own hit the same four walls. The bootcamp is built to take each one down.",
    items: [
      { title: "Too much theory, no direction", text: "Free videos explain what SEO or ads are. Nobody shows you what to do on Monday morning in a real marketing job." },
      { title: "Using ChatGPT is not an AI skill", text: "Employers now want marketers who can use AI to research, create and report faster, not just type a prompt." },
      { title: "Nothing to show an employer", text: "When a hiring manager asks for your work, a list of courses is not enough. You need campaigns, audits and reports you built." },
      { title: "No one to ask", text: "Learning alone means you never know if you are doing it right. Live classes and working instructors fix that." },
    ],
  },
  outcomes: {
    show: true,
    title: "What you leave with",
    lead: "Eight modules, five certifications and live classes from Thursday to Sunday. The next cohort starts {startDate}.",
    image: photo("learners"),
    items: [
      { title: "A portfolio of eight projects", text: "One practical project per module, ready to show an employer or a client." },
      { title: "Five certifications", text: "Google Digital Marketing & E-commerce, Meta Blueprint, HubSpot, GA4 and the Nerdy Pixels Academy certificate." },
      { title: "Hackathon", text: "Build a real campaign for a startup brand in the capstone hackathon." },
      { title: "The confidence to do it yourself", text: "Run SEO, ads, social, email and analytics without guessing, and measure what works." },
    ],
  },
  personas: {
    show: true,
    title: "Is this for you?",
    items: [
      { title: "Career switchers", text: "Your degree doesn't have to decide your career. Build skills and a portfolio employers can see.", image: photo("persona-switcher") },
      { title: "Graduates", text: "Finish school with skills companies are hiring for, and certifications to prove it.", image: photo("persona-graduate") },
      { title: "Working marketers", text: "You already run the social pages. Get the structure, the analytics and the title that go with it.", image: photo("persona-marketer") },
      { title: "Business owners", text: "Stop paying for marketing you can't measure. Learn to run ads, SEO and content yourself.", image: photo("persona-owner") },
    ],
  },
  curriculum: {
    show: true,
    title: "What you will learn",
    lead: "Live online classes from Thursday to Sunday, with a self-paced certification track alongside.",
    image: photo("curriculum"),
    modules: [{ name: "SEO" }, { name: "Social media marketing" }, { name: "Google Ads" }, { name: "Meta ads" }, { name: "Web analytics" }, { name: "Content strategy" }, { name: "Email marketing" }, { name: "AI marketing tools" }],
    outcomesTitle: "By the end of the bootcamp, you will be able to",
    outcomes: [
      { text: "Audit a website and build an SEO strategy that helps it rank" },
      { text: "Plan, launch and optimise Google Ads and Meta ads campaigns on a budget" },
      { text: "Grow and manage brand pages with a content and social media plan" },
      { text: "Set up GA4 and report on what is working and what is not" },
      { text: "Build email campaigns that turn subscribers into customers" },
      { text: "Use AI tools to research, write, design and report faster" },
      { text: "Present a portfolio of eight projects and a live brand campaign" },
      { text: "Pass five industry certifications, including Google, Meta and HubSpot" },
    ],
  },
  tools: {
    show: true,
    eyebrow: "Tools you will learn with",
    title: "Hands-on with the AI and marketing tools companies use every day",
    lead: "You practise on the real platforms in every module, so you can use them from day one in a job.",
    image: photo("tools"),
    // Official marks from Simple Icons (CC0), coloured with each brand's colour, in /brand/tools.
    ai: [
      { name: "ChatGPT", use: "Research and copy", logo: "/brand/tools/openai.svg", color: "#10A37F" },
      { name: "Claude", use: "Strategy and writing", logo: "/brand/tools/claude.svg", color: "#D97757" },
      { name: "Gemini", use: "Research and analysis", logo: "/brand/tools/googlegemini.svg", color: "#8E75B2" },
      { name: "Canva AI", use: "Design and creatives", logo: "/brand/tools/canva.svg", color: "#00C4CC" },
      { name: "Zapier", use: "Automations", logo: "/brand/tools/zapier.svg", color: "#FF4F00" },
    ],
    marketing: [
      { name: "Google Analytics 4", use: "Measurement", logo: "/brand/tools/googleanalytics.svg", color: "#E37400" },
      { name: "Google Ads", use: "Search and display", logo: "/brand/tools/googleads.svg", color: "#4285F4" },
      { name: "Meta Ads Manager", use: "Facebook and Instagram", logo: "/brand/tools/meta.svg", color: "#0467DF" },
      { name: "Google Search Console", use: "SEO", logo: "/brand/tools/googlesearchconsole.svg", color: "#458CF5" },
      { name: "HubSpot", use: "Email and CRM", logo: "/brand/tools/hubspot.svg", color: "#FF7A59" },
    ],
    certs: [{ name: "Google Digital Marketing & E-commerce" }, { name: "Meta Blueprint" }, { name: "HubSpot" }, { name: "Google Analytics 4" }, { name: "Nerdy Pixels Academy" }],
  },
  instructors: {
    show: true,
    eyebrow: "Your instructors",
    title: "Taught by working marketers",
    lead: "Every instructor has managed real campaigns, real budgets and real African clients. We don't hire people who only know how to teach, but people who are still doing the work.",
    // From npdacademy.com (names, specialties, LinkedIn). Photos from the speakers' headshot folder, as WebP.
    items: [
      { name: "Hakeem Okunola", role: "Search Engine Optimization", org: "Jumia Group", photo: "/brand/instructors/hakeem-okunola-720.webp", linkedin: "https://www.linkedin.com/in/hakeem-o-43703b15/" },
      { name: "Benjamin Shotala", role: "Email Marketing & Digital Growth", org: "", photo: "/brand/instructors/benjamin-shotala-720.webp", linkedin: "https://www.linkedin.com/in/benjamin-shotala/" },
      { name: "Kafilah Jimoh", role: "Social Media Strategy & Brand Communications", org: "", photo: "/brand/instructors/kafilah-jimoh-720.webp", linkedin: "https://www.linkedin.com/in/kafilahjimoh/" },
      { name: "Funmilayo Akinsanya", role: "Growth, Marketing & Sales Strategy", org: "", photo: "/brand/instructors/funmilayo-akinsanya-720.webp", linkedin: "https://www.linkedin.com/in/funmilayoakinsanya/" },
      { name: "Jahswill Obasuyi", role: "Social Media Marketing & Community Leadership", org: "", photo: "/brand/instructors/jahswill-obasuyi-720.webp", linkedin: "https://www.linkedin.com/in/jahswill-ojoobasuyi/" },
      { name: "Babatunde James", role: "Freelancing & Client Acquisition", org: "", photo: "/brand/instructors/babatunde-james-720.webp", linkedin: "https://www.linkedin.com/in/babatundejames/" },
      { name: "Esther Ayoade", role: "Sales, Brand Growth & Entrepreneurship", org: "", photo: "/brand/instructors/esther-ayoade-720.webp", linkedin: "https://www.linkedin.com/in/estherayoade/" },
      { name: "Fortuna Horsfall", role: "Visibility, Personal Branding & Community Growth", org: "", photo: "/brand/instructors/fortuna-horsfall-720.webp", linkedin: "https://www.linkedin.com/in/horsfallfortuna/" },
    ],
  },
  pricing: {
    show: true,
    eyebrow: "Pricing",
    title: "Pay in full, or reserve your seat with {deposit}.",
    lead: "Pay {early} once and you are done, or reserve your seat with {deposit} today and pay the {earlyBalance} balance by {balanceDue}. Prefer to spread it? The monthly plan is {monthly} a month, with no deposit.",
    guaranteeTitle: "7-day money-back guarantee on your deposit",
    guarantee: "Change your mind within 7 days of paying and we refund your {deposit} in full. After that, you can move it once to the following cohort.",
  },
  inside: {
    show: true,
    eyebrow: "See inside",
    title: "Watch a full class before you decide",
    lead: "This is a real, unedited class from the last cohort: the teaching, the pace and the live questions you get inside.",
  },
  freeClass: {
    show: true,
    lead: "Spend an hour with our instructors, build a one-page marketing strategy for a real business, and keep the template.",
    image: photo("free-class"),
    gets: [{ text: "The one-page strategy template used in class" }, { text: "The full replay within 24 hours, even if you miss it" }, { text: "Live Q&A on careers in marketing" }],
  },
  faq: {
    show: true,
    title: "Questions people ask before they reserve",
    items: [
      { q: "I am a complete beginner. Can I keep up?", a: "Yes. Every module starts from the fundamentals and builds up to practical work, so you do not need any marketing experience. Instructors answer questions live in every class." },
      { q: "What if I miss a live class?", a: "Every live class is recorded and the replay is shared with the cohort, so you can catch up the same week." },
      { q: "Are the certifications recognised by employers?", a: "Four of the five certifications are issued by Google, Meta, HubSpot and Google Analytics themselves, so employers know them. You also earn the Nerdy Pixels Academy certificate and a portfolio to show what you can do." },
      { q: "What happens to my {deposit} if I change my mind?", a: "You get a full refund if you ask within 7 days of paying, and no later than {balanceDue}. After that, the deposit is not refundable, but you can move it once to the following cohort." },
      { q: "What do I need to take part?", a: "A laptop, a reliable internet connection, and about 8 hours a week for live classes and projects." },
      { q: "Can I join and pay from anywhere in the world?", a: "Yes. Classes are live online and open to learners in any country. Prices show in your local currency, and you can pay with any Visa or Mastercard. If a payment fails, message us on WhatsApp and we will help you finish it." },
      { q: "Will this bootcamp get me a job?", a: "It gives you what employers ask for: practical skills, five recognised certifications and a portfolio of real work. Instructors also share career advice in class. Getting hired still depends on your effort and the roles you apply for, so we do not promise a specific job or salary." },
    ],
  },
  final: { show: true, image: "/brand/photos/final-team-1920.webp" },
};
export type HomeContent = typeof HOME_DEFAULTS;

const show: Field = { key: "show", label: "Show this section", type: "toggle" };
const textItem: Field[] = [{ key: "text", label: "Text", type: "text" }];

export const HOME_SCHEMA: Section[] = [
  { id: "offer", label: "Offer display", help: "Applies across the site: top bar, seat card, stats, checkout and the closing banner. The number of seats is set in Admin > Cohorts.", fields: [{ key: "showSeats", label: "Show how many early-bird seats are left (e.g. \"39 seats left\"). Off shows \"Limited seats\".", type: "toggle" }] },
  { id: "hero", label: "Hero", fields: [show, { key: "kicker", label: "Line above the headline", type: "text" }, { key: "title", label: "Headline", type: "text" }, { key: "accent", label: "Headline, highlighted part", type: "text" }, { key: "lead", label: "Intro paragraph", type: "textarea" }, { key: "secondary", label: "Free class link text", type: "text" }, { key: "trust", label: "Reassurance points", type: "list", itemLabel: "Point", item: textItem }, { key: "image", label: "Background photo", type: "image", help: "Shown faintly behind the hero with a slow zoom." }] },
  { id: "logos", label: "Alumni logos", help: "Logos themselves are managed in Media & syllabus.", fields: [show, { key: "label", label: "Label", type: "text" }] },
  { id: "stats", label: "Statistics", help: "Choose a live number, or type your own value.", fields: [show, { key: "items", label: "Stats", type: "list", itemLabel: "Stat", item: [{ key: "live", label: "Number", type: "select", options: [["", "Typed value"], ["seats_left", "Live: early-bird seats left"], ["days_to_start", "Live: days until classes start"], ["seat_limit", "Live: early-bird seats in total"]] }, { key: "value", label: "Value (when typed)", type: "text" }, { key: "label", label: "Label", type: "text" }] }] },
  { id: "results", label: "Testimonials & results", help: "Testimonial videos, quotes and photos are edited below this section in the builder.", fields: [show, { key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }, { key: "strip", label: "Last cohort numbers", type: "list", itemLabel: "Number", item: [{ key: "value", label: "Value", type: "text" }, { key: "label", label: "Label", type: "text" }] }] },
  { id: "problems", label: "Why people get stuck", fields: [show, { key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }, { key: "items", label: "Problems", type: "list", itemLabel: "Problem", item: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }] }] },
  { id: "curriculum", label: "Curriculum", fields: [show, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }, { key: "image", label: "Photo", type: "image" }, { key: "modules", label: "Modules", type: "list", itemLabel: "Module", item: [{ key: "name", label: "Name", type: "text" }] }, { key: "outcomesTitle", label: "Learning outcomes heading", type: "text" }, { key: "outcomes", label: "Learning outcomes", type: "list", itemLabel: "Outcome", item: textItem }] },
  { id: "outcomes", label: "What you leave with", fields: [show, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }, { key: "image", label: "Photo", type: "image" }, { key: "items", label: "Outcomes", type: "list", itemLabel: "Outcome", item: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }] }] },
  { id: "personas", label: "Is this for you?", fields: [show, { key: "title", label: "Heading", type: "text" }, { key: "items", label: "People", type: "list", itemLabel: "Person", item: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Text", type: "textarea" }, { key: "image", label: "Photo", type: "image" }] }] },
  { id: "tools", label: "Tools", fields: [show, { key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }, { key: "image", label: "Photo", type: "image" }, { key: "ai", label: "AI tools", type: "list", itemLabel: "Tool", item: [{ key: "name", label: "Name", type: "text" }, { key: "use", label: "Used for", type: "text" }, { key: "logo", label: "Logo (SVG or image)", type: "image" }, { key: "color", label: "Brand colour (e.g. #10A37F)", type: "text" }] }, { key: "marketing", label: "Marketing tools", type: "list", itemLabel: "Tool", item: [{ key: "name", label: "Name", type: "text" }, { key: "use", label: "Used for", type: "text" }, { key: "logo", label: "Logo (SVG or image)", type: "image" }, { key: "color", label: "Brand colour (e.g. #10A37F)", type: "text" }] }, { key: "certs", label: "Certifications", type: "list", itemLabel: "Certification", item: [{ key: "name", label: "Name", type: "text" }] }] },
  { id: "instructors", label: "Instructors", fields: [show, { key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }, { key: "items", label: "Instructors", type: "list", itemLabel: "Instructor", item: [{ key: "name", label: "Name", type: "text" }, { key: "role", label: "Specialty", type: "text" }, { key: "org", label: "Company (optional)", type: "text" }, { key: "photo", label: "Photo, portrait 4:5 (leave empty for initials)", type: "image" }, { key: "linkedin", label: "LinkedIn link", type: "url" }] }] },
  { id: "pricing", label: "Pricing", help: "Prices, dates and seats come from Cohorts and Currencies.", fields: [show, { key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }, { key: "guaranteeTitle", label: "Guarantee title", type: "text" }, { key: "guarantee", label: "Guarantee text", type: "textarea" }] },
  { id: "inside", label: "See inside (class recording)", help: "The video is set in Media & syllabus.", fields: [show, { key: "eyebrow", label: "Eyebrow", type: "text" }, { key: "title", label: "Heading", type: "text" }, { key: "lead", label: "Intro", type: "textarea" }] },
  { id: "freeClass", label: "Free class", help: "Date and title are set on the cohort.", fields: [show, { key: "lead", label: "Intro", type: "textarea" }, { key: "image", label: "Photo", type: "image" }, { key: "gets", label: "What they get", type: "list", itemLabel: "Item", item: textItem }] },
  { id: "faq", label: "FAQ", fields: [show, { key: "title", label: "Heading", type: "text" }, { key: "items", label: "Questions", type: "list", itemLabel: "Question", item: [{ key: "q", label: "Question", type: "text" }, { key: "a", label: "Answer", type: "textarea" }] }] },
  { id: "final", label: "Final call to action", fields: [show, { key: "image", label: "Background photo", type: "image" }] },
];

/** Published or draft content merged over the defaults, one section at a time. */
export function mergeHome(saved: unknown): HomeContent {
  const s = (saved && typeof saved === "object" ? saved : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(HOME_DEFAULTS)) {
    const v = s[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...def, ...(v as object) } : def;
  }
  return out as HomeContent;
}
