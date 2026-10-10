import { FALLBACK_COURSE_CONFIG } from "@/lib/course-config.functions";
import { mergeHome } from "@/lib/cms-home";
import { longDate } from "@/lib/plans";
import { embedFor } from "@/lib/video";

const logoDarkA = { url: "/brand/logo-dark.webp" };
const logoLightA = { url: "/brand/logo-light.webp" };

/* ============ Config (from the open cohort, Admin > Cohorts) ============ */
const SITE = { phone:"2349136713644", phoneLabel:"+234 913 671 3644", email:"info@npdacademy.com" };
let COURSE_CONFIG = null;
let CMS_DRAFT = null; // live preview from the admin builder
const cfg = () => COURSE_CONFIG || FALLBACK_COURSE_CONFIG;
export function primeCourseConfig(value){
  COURSE_CONFIG = value || COURSE_CONFIG;
  // Development only: preview the post-migration offer with ?demo=deposit (removed from production builds).
  if (import.meta.env.DEV && COURSE_CONFIG && typeof location !== "undefined" && /[?&]demo=deposit/.test(location.search))
    COURSE_CONFIG = { ...COURSE_CONFIG, startDate:"Saturday 14 November 2026", earlyBirdDeadline:"2026-10-31T22:59:59Z", depositAmount:10000, balanceDueDate:"2026-10-31", seatLimit:40, seatsTaken:1, freeClassAt:"2026-10-17T10:00:00Z", currencies: FALLBACK_COURSE_CONFIG.currencies, hasSyllabus:true };
}
const HOME = () => mergeHome(CMS_DRAFT || cfg().content);
const EARLY_END = () => new Date(cfg().earlyBirdDeadline || 0);
const PRICE_EARLY = () => cfg().earlyBirdPrice, PRICE_MONTH = () => cfg().instalmentAmount;
const DEP = () => Number(cfg().depositAmount || 0) > 0;
const SHOW_SEATS = () => HOME().offer?.showSeats !== false;
/** Seats left, only when the admin chose to show it. Never shows the total. */
const SEATS_SHOWN = () => (SHOW_SEATS() ? SEATS_LEFT() : null);
const SEATS_LEFT = () => cfg().seatLimit ? Math.max(0, cfg().seatLimit - (cfg().seatsTaken || 0)) : null;
const COHORT_START = () => cfg().startDate;
const shortDate = iso => longDate(iso, true).replace(/ \d{4}$/, "");
const startShort = () => String(COHORT_START()).replace(/ \d{4}$/, "");
const EARLY_DATE = () => cfg().earlyBirdDeadline ? shortDate(cfg().earlyBirdDeadline) : "";
const BAL_DATE = () => cfg().balanceDueDate ? shortDate(cfg().balanceDueDate) : "";
const FREE = () => {
  const at = cfg().freeClassAt ? new Date(cfg().freeClassAt) : null;
  const ok = at && !Number.isNaN(at.getTime());
  const wat = ok ? at.toLocaleTimeString("en-GB", { hour:"numeric", minute:"2-digit", hour12:true, timeZone:"Africa/Lagos" }).toUpperCase() : "";
  const gmt = ok ? at.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", timeZone:"UTC" }) : "";
  const utc = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { title: cfg().freeClassTitle || "Build your first marketing strategy", at, past: ok ? at.getTime() + 2 * 3600e3 < Date.now() : false,
    dateLabel: ok ? longDate(cfg().freeClassAt, true) : "", day: ok ? shortDate(cfg().freeClassAt) : "", timeLabel: ok ? `${wat} WAT (${gmt} GMT)` : "",
    startUTC: ok ? utc(at) : "", endUTC: ok ? utc(new Date(at.getTime() + 3600e3)) : "" };
};
const EVENT = { get title(){ return FREE().title; }, get dateLabel(){ return FREE().dateLabel; }, get timeLabel(){ return FREE().timeLabel; }, get startUTC(){ return FREE().startUTC; }, get endUTC(){ return FREE().endUTC; } };
const wa = t => "https://wa.me/" + SITE.phone + "?text=" + encodeURIComponent(t);
const naira = n => "₦" + Math.round(Number(n)).toLocaleString("en-NG");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* preview switch: /...?preview=closed or ?preview=open, remembered for the session */
function earlyOpen(){
  let p = null; try{ p = sessionStorage.getItem("npa-preview"); }catch(e){}
  if (p === "closed") return false;
  if (p === "open") return true;
  const s = SEATS_LEFT();
  return cfg().earlyBirdEnabled && !!cfg().earlyBirdDeadline && Date.now() <= EARLY_END().getTime() && (s === null || s > 0);
}

/* ============ Currency ============
   Naira prices come from the cohort; other currencies are fixed prices set in Admin > Currencies.
   Detection order: ?currency= link, the visitor's own choice, their country (edge header), timezone, language. */
const COUNTRY_CURRENCY = { NG:"NGN", GH:"GHS", KE:"KES", ZA:"ZAR", GB:"GBP", CA:"CAD", US:"USD",
  IE:"EUR", FR:"EUR", DE:"EUR", ES:"EUR", IT:"EUR", NL:"EUR", BE:"EUR", AT:"EUR", PT:"EUR", FI:"EUR", GR:"EUR", LU:"EUR", SK:"EUR", SI:"EUR", EE:"EUR", LV:"EUR", LT:"EUR", HR:"EUR", MT:"EUR", CY:"EUR" };
const TZ_COUNTRY = { "Africa/Lagos":"NG", "Africa/Accra":"GH", "Africa/Nairobi":"KE", "Africa/Johannesburg":"ZA", "Europe/London":"GB", "Europe/Dublin":"IE", "Europe/Paris":"FR", "Europe/Berlin":"DE", "Europe/Madrid":"ES", "Europe/Rome":"IT", "Europe/Amsterdam":"NL", "Europe/Brussels":"BE", "Europe/Vienna":"AT", "Europe/Lisbon":"PT", "America/Toronto":"CA", "America/Vancouver":"CA", "America/New_York":"US", "America/Chicago":"US", "America/Los_Angeles":"US" };
let CUR_CODE = "NGN", CUR_HOW = "auto";
let GEO = null;
export function primeGeo(c){
  if (!c || c === GEO) return; GEO = c;
  // Arrived after the page booted: switch the default currency unless the visitor chose one.
  if (typeof document !== "undefined" && booted && CUR_HOW === "auto") { const [code, how] = detectCurrency(); if (code !== CUR_CODE) { setCurrency(code, how); render(true); } }
}
function curList(){ return [{ code:"NGN", label:"Naira", symbol:"₦", deposit:cfg().depositAmount, early:cfg().earlyBirdPrice, monthly:cfg().instalmentAmount, chargeable:true }, ...(cfg().currencies || [])]; }
const curRow = code => curList().find(c => c.code === code) || curList()[0];
/* Default: Nigeria sees naira, everyone else sees US dollars (the currency we can actually charge).
   A country switches to its own currency by default only once that currency is chargeable. */
function autoCurrency(countryCode){
  if (countryCode === "NG") return "NGN";
  const local = curList().find(x => x.code === COUNTRY_CURRENCY[countryCode] && x.chargeable);
  if (local) return local.code;
  return curList().some(x => x.code === "USD") ? "USD" : "NGN";
}
function detectCurrency(){
  const ok = c => c && curList().some(x => x.code === c);
  try{ const f = new URLSearchParams(location.search).get("currency"); if (ok(f && f.toUpperCase())) return [f.toUpperCase(), "link"]; }catch(e){}
  try{ const s = localStorage.getItem("npa_currency"); if (ok(s)) return [s, "manual"]; }catch(e){}
  if (GEO) return [autoCurrency(GEO), "auto"];
  let tz = ""; try{ tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }catch(e){}
  if (TZ_COUNTRY[tz]) return [autoCurrency(TZ_COUNTRY[tz]), "auto"];
  // No signal at all: naira, since most visitors are in Nigeria.
  return ["NGN", "auto"];
}
function setCurrency(code, how){ CUR_CODE = curRow(code).code; CUR_HOW = how; }
/** Prices in the visitor's display currency. */
function PV(code){
  const c = curRow(code || CUR_CODE), count = cfg().instalmentCount || 3;
  const v = { deposit:c.deposit, early:c.early, earlyBal:c.early - c.deposit, monthly:c.monthly, monthlyFirst:c.monthly - c.deposit, monthlyTotal:c.monthly * count, save:c.monthly * count - c.early };
  if (!DEP()) { v.deposit = c.code === "NGN" ? 0 : v.deposit; }
  return v;
}
const money = (n, code) => { const c = curRow(code || CUR_CODE); return c.code === "NGN" ? naira(n) : c.symbol + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }); };
/** The currency actually charged: itself if enabled in Flutterwave, else USD, else naira. */
const chargeCode = code => { const c = curRow(code || CUR_CODE); if (c.code === "NGN" || c.chargeable) return c.code; return curList().some(x => x.code === "USD" && x.chargeable) ? "USD" : "NGN"; };
const P$ = key => `<span data-p="${key}">${money(PV()[key])}</span>`;
function curSelect(){ return `<select class="cur-sel" aria-label="Show prices in">${curList().map(c => `<option value="${c.code}"${c.code===CUR_CODE?" selected":""}>${esc(c.label)} (${esc(c.symbol.trim())})</option>`).join("")}</select>`; }
/** Live tokens in CMS text, e.g. "{deposit} today". Values are escaped; tokens become live spans. */
/** Keeps hyphenated words such as "AI-powered" on one line. */
const nobreak = html => html.replace(/(^|[\s>])([^\s<>]*\w-\w[^\s<>]*)/g, (m, pre, w) => `${pre}<span class="nowrap">${w}</span>`);
function T(text){
  const map = { deposit:P$("deposit"), early:P$("early"), earlyBalance:P$("earlyBal"), monthly:P$("monthly"), monthlyFirst:P$("monthlyFirst"), monthlyTotal:P$("monthlyTotal"), save:P$("save"),
    startDate:esc(COHORT_START()), earlyDeadline:esc(EARLY_DATE()), balanceDue:esc(BAL_DATE()), seatsLeft:`<span class="js-seats-left">${SEATS_SHOWN() ?? ""}</span>`, seatLimit:esc(cfg().seatLimit ?? ""), freeClassDate:esc(FREE().day) };
  return esc(text).replace(/\{(\w+)\}/g, (m, k) => map[k] ?? m);
}
function applyCurrency(){
  const v = PV();
  document.querySelectorAll("[data-p]").forEach(el => { el.textContent = money(v[el.dataset.p]); });
  document.querySelectorAll(".cur-sel").forEach(s => { s.value = CUR_CODE; });
  document.querySelectorAll("[data-cur-note]").forEach(n => { n.textContent = CUR_HOW === "auto" && CUR_CODE !== "NGN" ? "· based on your location" : ""; });
  const charged = chargeCode();
  document.querySelectorAll("[data-charge-note]").forEach(n => { n.textContent = charged !== CUR_CODE ? `Shown in ${curRow().label}. You'll be charged ${money(v.deposit || v.early, charged)} in ${curRow(charged).label}.` : ""; n.hidden = charged === CUR_CODE; });
  const pt = document.getElementById("payText"), pm = document.getElementById("payMethods");
  if (pt) pt.textContent = CUR_CODE === "NGN" ? "Pay in naira by bank transfer, USSD or card. Paying from abroad? Any international Visa or Mastercard works too." : `You are seeing prices in ${curRow().label}. Pay with any Visa or Mastercard debit or credit card, wherever you are.`;
  if (pm) pm.innerHTML = (CUR_CODE === "NGN" ? ["Bank transfer","USSD","Visa","Mastercard","Verve"] : ["Visa","Mastercard","Debit cards","Credit cards"]).map(m => `<span>${m}</span>`).join("");
  document.querySelectorAll('a[href*="/checkout"]').forEach(a => { const u = new URL(a.getAttribute("href"), location.origin); if (CUR_CODE === "NGN") u.searchParams.delete("currency"); else u.searchParams.set("currency", CUR_CODE); a.setAttribute("href", u.pathname + u.search); });
}

/* ============ Storage ============ */
const KEY = "npa-site-v1";
function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch(e){ return {}; } }
function save(k, item){ const s = load(); (s[k] = s[k] || []).push({...item, at:new Date().toISOString()}); try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }
function lastOf(k){ const a = load()[k] || []; return a[a.length-1] || null; }
function sget(k){ try{ return JSON.parse(sessionStorage.getItem(k)); }catch(e){ return null; } }
function sset(k,v){ try{ sessionStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

/* ============ Icons ============ */
const I = {
  check:(c="#169C4B",s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  lock:(c="currentColor")=>`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  wa:(c="#06301A",s=22)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3z"/></svg>`,
  menu:()=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  globe:()=>`<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" style="flex:none;color:var(--purple)"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>`
};
const check = (t, c) => `<li class="check">${I.check(c)}<span>${t}</span></li>`;

/* ============ Data ============ */
const MODULES = [
 ["1","Digital marketing foundations and strategy","Customer research, positioning, the marketing funnel and choosing channels for an African market.","A one-page marketing strategy for a real brand",true],
 ["2","Content marketing and copywriting","Content pillars, storytelling, copy that converts, and planning with AI tools.","A 30-day content calendar and three published pieces",false],
 ["3","Social media marketing","Organic growth on Instagram, TikTok, LinkedIn and X, community management and creator partnerships.","A social media growth plan with sample posts",true],
 ["4","Search engine optimisation (SEO)","SEO fundamentals, technical SEO and the AI search landscape, lead generation and outbound systems, and building an SEO strategy.","A full SEO audit and strategy for a live website",true],
 ["5","Paid media: Meta and Google Ads","Campaign structure, audiences, budgets, creative testing and reading results.","A paid campaign plan with ad sets and a test budget",false],
 ["6","Email marketing, CRM and automation","List building, segmentation, nurture sequences and WhatsApp follow-up.","A five-email nurture sequence",true],
 ["7","Analytics and measurement with GA4","Tracking plans, UTMs, conversions and reporting that decision-makers read.","A GA4 reporting dashboard",true],
 ["8","Growth, portfolio and career launch","Growth experiments, pricing your work, CVs, LinkedIn and interviewing.","A finished portfolio and career profile",false]
];
const INSTRUCTORS = [["HO","Hakeem Okunola","Search Manager, Jumia Group"],["DO","Damilola Oyeleke","Paid Media Specialist"],["TD","Tony Diallo","PPC Specialist"],["EA","Esther Ayoade","AI Growth Marketing Specialist"],["FJ","Faiz Jamal","AI and Automations"],["BS","Benjamin Shotala","Email Marketing Specialist"]];
const COUNTRIES = [
 {code:"NG",name:"Nigeria",cur:"NGN",curName:"Nigerian naira",dial:"+234",methods:[["card","Card","Visa, Mastercard or Verve"],["transfer","Bank transfer","Pay into a one-time account number"],["ussd","USSD","Dial a code from your bank line"]]},
 {code:"GH",name:"Ghana",cur:"GHS",curName:"Ghanaian cedi",dial:"+233",methods:[["momo","Mobile money","MTN, Telecel or AirtelTigo. Approve on your phone"],["card","Card","Visa or Mastercard"],["transfer","Bank transfer","Pay from your bank app"]]},
 {code:"KE",name:"Kenya",cur:"KES",curName:"Kenyan shilling",dial:"+254",methods:[["mpesa","M-Pesa","Enter your PIN on the prompt sent to your phone"],["airtel","Airtel Money","Approve on your phone"],["card","Card","Visa or Mastercard"]]},
 {code:"ZA",name:"South Africa",cur:"ZAR",curName:"South African rand",dial:"+27",methods:[["card","Card","Visa or Mastercard"],["eft","Instant EFT","Pay securely from your bank app"]]},
 {code:"UG",name:"Uganda",cur:"UGX",curName:"Ugandan shilling",dial:"+256",methods:[["momo","MTN Mobile Money","Approve on your phone"],["airtel","Airtel Money","Approve on your phone"],["card","Card","Visa or Mastercard"]]},
 {code:"RW",name:"Rwanda",cur:"RWF",curName:"Rwandan franc",dial:"+250",methods:[["momo","MTN Mobile Money","Approve on your phone"],["airtel","Airtel Money","Approve on your phone"],["card","Card","Visa or Mastercard"]]},
 {code:"TZ",name:"Tanzania",cur:"TZS",curName:"Tanzanian shilling",dial:"+255",methods:[["mpesa","M-Pesa","Approve on your phone"],["airtel","Airtel Money","Approve on your phone"],["card","Card","Visa or Mastercard"]]},
 {code:"ZM",name:"Zambia",cur:"ZMW",curName:"Zambian kwacha",dial:"+260",methods:[["momo","MTN Mobile Money","Approve on your phone"],["airtel","Airtel Money","Approve on your phone"],["card","Card","Visa or Mastercard"]]},
 {code:"CM",name:"Cameroon",cur:"XAF",curName:"Central African CFA franc",dial:"+237",methods:[["momo","MTN Mobile Money","Approve on your phone"],["orange","Orange Money","Approve on your phone"],["card","Card","Visa or Mastercard"]]},
 {code:"CI",name:"Côte d'Ivoire",cur:"XOF",curName:"West African CFA franc",dial:"+225",methods:[["orange","Orange Money","Approve on your phone"],["momo","MTN Mobile Money","Approve on your phone"],["wave","Wave","Approve in the Wave app"],["card","Card","Visa or Mastercard"]]},
 {code:"SN",name:"Senegal",cur:"XOF",curName:"West African CFA franc",dial:"+221",methods:[["wave","Wave","Approve in the Wave app"],["orange","Orange Money","Approve on your phone"],["card","Card","Visa or Mastercard"]]},
 {code:"XX",name:"Another country",cur:"USD",curName:"US dollars",dial:"+",methods:[["card","Card","Visa or Mastercard, charged in US dollars"]]}
];
const country = code => COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
const countryOptions = sel => COUNTRIES.map(c => `<option value="${c.code}"${c.code===sel?" selected":""}>${esc(c.name)}</option>`).join("");
const COURSES = [
 {slug:"seo-professional",name:"SEO Professional",weeks:"6 weeks",text:"Technical SEO, content strategy and reporting for people who want to specialise in search."},
 {slug:"advanced-social-media",name:"Advanced Social Media",weeks:"6 weeks",text:"Community growth, creator partnerships and social strategy for brands across Africa."},
 {slug:"performance-marketing",name:"Performance Marketing",weeks:"6 weeks",text:"Paid media on Meta and Google, budgeting, testing and scaling campaigns that pay back."},
 {slug:"analytics",name:"Analytics",weeks:"4 weeks",text:"Tracking, dashboards and turning marketing data into decisions."},
 {slug:"web-and-ai-design",name:"Web and AI Design",weeks:"8 to 10 weeks",text:"Design and build marketing websites and landing pages with modern AI tools."}
];
const PERSONAS = [["Career switchers","Your degree doesn't have to decide your career. Build skills and a portfolio employers can see."],["Graduates","Finish school with skills companies are hiring for, and certifications to prove it."],["Working marketers","You already run the social pages. Get the structure, the analytics and the title that go with it."],["Business owners","Stop paying for marketing you can't measure. Learn to run ads, SEO and content yourself."]];
const FAQS = () => [
 ["The bootcamp",[
  ["Who is the bootcamp for?","Beginners and early-career marketers: career switchers, graduates, people already handling marketing at work, and business owners. Module 1 assumes no prior knowledge."],
  ["How much time does it take each week?","Plan for self-paced certification work from Monday to Wednesday and live online classes from Thursday to Sunday. Each module ends with a portfolio piece you build with feedback."],
  ["When does the next cohort start?","Classes start on " + COHORT_START() + ". Orientation details are sent by email and WhatsApp once you enroll."],
  ["Which certifications will I earn?","Five industry-recognised certifications, earned module by module as you go, plus our certificate of completion when you finish the bootcamp."],
  ["What equipment do I need?","A laptop or smartphone with a stable internet connection and a Google account. A laptop makes the practical work easier."]
 ]],
 ["Paying",[
  ...(DEP() ? [
   ["What does it cost?",`Reserve your seat with a ${naira(cfg().depositAmount)} deposit. On the early-bird plan (until ${EARLY_DATE()}${cfg().seatLimit?" or until seats run out":""}) the bootcamp is ${naira(PRICE_EARLY())} in total: the deposit, then ${naira(PRICE_EARLY()-cfg().depositAmount)} by ${BAL_DATE()}. On the monthly plan it is ${naira(PRICE_MONTH())} a month for ${cfg().instalmentCount} months.`],
   ["How does the monthly plan work?",`There's no deposit. You pay ${naira(PRICE_MONTH())} by ${startShort()}, then ${naira(PRICE_MONTH())} on 1 December and 1 January: ${naira(PRICE_MONTH()*cfg().instalmentCount)} in total. We email a reminder before each date.`],
   ["Is the deposit refundable?",`Yes. Ask within 7 days of paying, and no later than ${BAL_DATE()}, for a full refund. After that you can move it once to the following cohort.`],
  ] : [
   ["What does it cost?",`The early-bird price is ${naira(PRICE_EARLY())} paid once, until ${EARLY_DATE()}. After that, the bootcamp is ${naira(PRICE_MONTH())} a month for ${cfg().instalmentCount} months.`],
   ["How does the monthly plan work?",`You pay the first instalment of ${naira(PRICE_MONTH())} when you enroll. The December and January instalments are ${naira(PRICE_MONTH())} each, payable on the 1st of the month. We email a reminder before each date.`],
  ]),
  ["Can I pay from outside Nigeria?","Yes. Prices show in your local currency where we can, and you can pay with any Visa or Mastercard from anywhere in the world. You see the exact amount before you confirm."],
  ["Is my payment secure?","Yes. Payments are processed by our licensed payment partner. We never see or store your card details or wallet PIN."],
  ["Do you have a referral code?","If a graduate or ambassador referred you, enter their code at checkout so they get credit."]
 ]],
 ["The free event",[
  ["What is the free event?", EVENT.title + " is a one-hour live online session on " + EVENT.dateLabel + " at " + EVENT.timeLabel + ". You build a one-page strategy for a real business and take home the template."],
  ["What if I can't attend live?","Register anyway. Everyone who registers gets the replay and the template within 24 hours."]
 ]]
];
const MOD_CERT = '<span class="pill green" style="margin-top:6px">Certification included</span>';
const svg = (id, cls) => `<svg${cls?` class="${cls}"`:""} aria-hidden="true"><use href="#i-${id}"/></svg>`;
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="i-play" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.8"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 2.5 4 5.5v6c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10v-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
<symbol id="i-badge" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m8.5 14.2-1.5 7.3 5-2.7 5 2.7-1.5-7.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
<symbol id="i-brand" viewBox="0 0 24 24"><path d="M4 20V9l8-5 8 5v11h-5v-6H9v6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20h16M7 16v-5m5 5V7m5 9v-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></symbol>
</svg>`;

/* ---------- Calls to action follow the live offer ---------- */
function CTA(){
  const open = earlyOpen();
  if (DEP() && open) return { href: "/checkout?plan=deposit-early", label: `<span>Reserve my seat for ${P$("deposit")}</span>`, short: "Reserve my seat" };
  if (DEP()) return { href: "/checkout?plan=monthly", label: `<span>Start the monthly plan for ${P$("monthly")}</span>`, short: "Enroll now" };
  return { href: open ? "/checkout?plan=early" : "/checkout?plan=monthly", label: open ? `Enroll for ${naira(PRICE_EARLY())}` : "Enroll now", short: "Enroll now" };
}
/** Paying in full at the early-bird price, offered next to the deposit while early bird is open. */
const FULL = () => DEP() && earlyOpen() && cfg().earlyBirdEnabled;
const fullBtn = (where, cls = "btn ghost block") => `<a class="${cls} full-pay" href="/checkout?plan=early" data-ga-enrol="${where}_full"><span>Pay ${P$("early")} in full now</span></a>`;
/* Responsive WebP: /brand/photos/x-1200.webp also has x-640 (and the hero x-1920 / x-960). */
function pic(src, alt, opts = {}){
  if (!src) return "";
  const s = esc(src), m = src.match(/^(\/brand\/photos\/.+)-(1920|1200)\.webp$/);
  const srcset = m ? (m[2] === "1920" ? `${m[1]}-960.webp 960w, ${s} 1920w` : `${m[1]}-640.webp 640w, ${s} 1200w`) : "";
  return `<img src="${s}"${srcset?` srcset="${srcset}" sizes="${opts.sizes || "(max-width:760px) 100vw, 50vw"}"`:""} alt="${esc(alt || "")}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async"${opts.cls?` class="${opts.cls}"`:""} width="${opts.w || 1200}" height="${opts.h || 800}">`;
}

/* ============ Layout ============ */
function header(path){
  const on = p => (p === "/" ? path === "/" : path.startsWith(p)) ? ' class="on" aria-current="page"' : "";
  const open = earlyOpen(), s = SEATS_LEFT(), cta = CTA();
  const freeHref = path === "/" ? "#free-class" : "/events/first-marketing-strategy";
  const bar = open
    ? `<div class="bar" role="note"><b>${esc(cfg().offerLabel)}:</b> ${SEATS_SHOWN() !== null ? `only <span class="js-seats-left">${SEATS_SHOWN()}</span> seats left · ` : "limited seats · "}closes ${esc(EARLY_DATE())} <span class="cd" data-countdown="${esc(cfg().earlyBirdDeadline)}" data-label="left" aria-label="Time left"></span><a href="${cta.href}" data-ga-enrol="announcement_bar">${cta.short}</a></div>`
    : `<div class="bar" role="note"><b>Enrollment for ${esc(cfg().cohortName)} is open:</b> ${DEP() ? `reserve your seat with ${P$("deposit")}` : `${naira(PRICE_MONTH())} a month for ${cfg().instalmentCount} months`}. <a href="${cta.href}" data-ga-enrol="announcement_bar">${cta.short}</a></div>`;
  return `${SPRITE}<a class="skip" href="#main">Skip to content</a>${bar}<header class="top"><div class="wrap nav">
<a class="logo" href="/" aria-label="Nerdy Pixels Academy home"><img src="${logoDarkA.url}" alt="Nerdy Pixels Academy" width="64" height="42"></a>
<nav class="menu" aria-label="Main"><a href="/"${on("/")}>Home</a>
<div class="dd"><button type="button" class="dd-btn${path.startsWith("/courses")||path.startsWith("/curriculum")||path.startsWith("/waitlist")?" on":""}" aria-expanded="false" aria-controls="dd-courses" data-act="dd">Courses${svg("chev")}</button>
<div class="dd-panel" id="dd-courses"><a href="/courses/digital-marketing"><b>${esc(cfg().courseTitle)}</b><span>Enrolling now · starts ${esc(shortDate(COHORT_START()) || COHORT_START())}</span></a><a href="/curriculum"><b>Curriculum</b><span>All eight modules in detail</span></a>${COURSES.slice(0,3).map(c=>`<a href="/waitlist/${c.slug}"><b>${c.name}</b><span>${c.weeks} · join the waitlist</span></a>`).join("")}<a href="/courses" class="all">All courses →</a></div></div>
<a href="/blog"${on("/blog")}>Blog</a><a href="/faq"${on("/faq")}>FAQ</a><a href="/contact"${on("/contact")}>Contact Us</a></nav>
<div class="nav-cta"><a class="btn ghost sm" href="${freeHref}" data-ga-free-event>Free class</a><a class="btn sm" href="${cta.href}" data-ga-enrol="header">${cta.short}</a>
<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer" data-act="menu">${svg("menu")}</button></div>
</div>
<nav class="drawer" id="drawer" aria-label="Mobile" hidden><a href="/">Home</a><a href="/courses">Courses</a><a href="/courses/digital-marketing">${esc(cfg().courseTitle)}</a><a href="/curriculum">Curriculum</a><a href="${freeHref}" data-ga-free-event>Free class</a><a href="/blog">Blog</a><a href="/faq">FAQ</a><a href="/contact">Contact Us</a><a href="/student">Student login</a><a class="btn green block" href="${cta.href}" data-ga-enrol="mobile_menu">${cta.label}</a></nav>
</header>`;
}
function footer(path){
  return `<footer><div class="wrap stack" style="gap:36px">
<div class="grid g4">
<div class="stack footer-brand" style="gap:10px"><a class="logo footer-logo" href="/"><img src="${logoLightA.url}" alt="Nerdy Pixels Academy" loading="lazy" width="140" height="95"></a><p class="small" style="color:var(--on-dark-2)">Practical digital marketing training for Africa's emerging workforce.</p></div>
<div class="stack" style="gap:10px"><h3>Learn</h3><a href="/courses/digital-marketing">${esc(cfg().courseTitle)}</a><a href="/curriculum">Curriculum</a><a href="/courses">All courses</a><a href="/events/first-marketing-strategy" data-ga-free-event>Free class</a><a href="/blog">Blog</a>${cfg().hasSyllabus?`<button type="button" class="linkbtn" data-open="syllabus">Download the syllabus</button>`:""}</div>
<div class="stack" style="gap:10px"><h3>Students</h3><a href="/student">Student login</a><a href="/onboarding">Student onboarding</a><a href="/pay-instalment">Pay an instalment</a><a href="/faq">FAQ</a><a href="/terms">Terms of enrollment</a><a href="/payment-policy">Payment policy</a><a href="/privacy">Privacy policy</a></div>
<div class="stack" style="gap:10px"><h3>Contact</h3><a href="mailto:${SITE.email}">${SITE.email}</a><a href="tel:+${SITE.phone}">${SITE.phoneLabel}</a><a href="${wa("Hello Nerdy Pixels Academy, I have a question.")}" target="_blank" rel="noopener" data-ga-whatsapp>Chat on WhatsApp</a><a href="/contact">Contact form</a></div>
</div>
<p class="small" style="color:#BBAADC;border-top:1px solid var(--deep-line);padding-top:20px">© ${new Date().getFullYear()} Nerdy Pixels Digital. All rights reserved.</p>
</div></footer>
<a class="wa-float" href="${wa("Hello Nerdy Pixels Academy, I'd like to know more about the bootcamp.")}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp" data-ga-whatsapp>${I.wa("#ffffff",30)}</a>
${syllabusModal()}
<div class="modal vmodal" id="vmodal" hidden role="dialog" aria-modal="true" aria-label="Video"><div class="vbox"><button class="x" type="button" data-close-video aria-label="Close video">${svg("x")}</button><div class="vframe" id="vframe"></div><p class="vcap" id="vcap"></p></div></div>`;
}
function syllabusModal(){
  return `<div class="modal" id="syllabus" hidden role="dialog" aria-modal="true" aria-labelledby="syl-title">
<form class="box" data-form="syllabus" novalidate><div class="mhead"><div><h3 id="syl-title">Get the full syllabus, free</h3><p class="small muted">Every module, the eight portfolio projects and the tools you will use. Sent to your email.</p></div><button class="x" type="button" data-close-syllabus aria-label="Close">${svg("x")}</button></div>
<div class="sy-fields stack" style="gap:12px"><label class="f">First name<input name="first" autocomplete="given-name" maxlength="60" required></label>
<label class="f">Email<input name="email" type="email" inputmode="email" autocomplete="email" maxlength="200" required></label>
<label class="f">WhatsApp number (optional)<input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="+234 or your country code"></label>
<input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
<button class="btn green block" type="submit">Send me the syllabus</button></div>
<div class="ok" hidden>Sent. Check your email for the syllabus.</div></form></div>`;
}

/* ---------- Video: plays in a lightbox on our page; the player can't open other sites ---------- */
const DEFAULT_THUMBS = ["/brand/photos/testimonial-1-1200.webp", "/brand/photos/testimonial-2-1200.webp", "/brand/photos/testimonial-3-1200.webp"];
function vcard(m, i){
  const e = embedFor(m.video_url), thumb = m.image_url || DEFAULT_THUMBS[i % 3] || e?.thumb;
  const inner = `<div class="vthumb">${pic(thumb, "", { sizes:"(max-width:820px) 100vw, 33vw" })}${e?`<span class="play">${svg("play")}</span>`:`<span class="soon">Video story coming soon</span>`}</div><div class="meta"><b>${esc(m.title)}</b>${m.subtitle?`<span class="small muted">${esc(m.subtitle)}</span>`:""}${m.quote?`<blockquote>${esc(m.quote)}</blockquote>`:""}</div>`;
  return e ? `<button type="button" class="vcard" data-video="${esc(m.id)}" aria-label="Play ${esc(m.title)}'s story">${inner}</button>` : `<article class="vcard">${inner}</article>`;
}
function openVideo(id){
  const m = (cfg().media || []).find(x => x.id === id); const e = m && embedFor(m.video_url); if (!e) return;
  const box = document.getElementById("vmodal"), fr = document.getElementById("vframe"); if (!box || !fr) return;
  fr.innerHTML = e.kind === "video"
    ? `<video src="${esc(e.src)}" controls autoplay playsinline controlslist="nodownload noremoteplayback" disablepictureinpicture oncontextmenu="return false"></video>`
    // No allow-popups / allow-top-navigation: logos and "watch on" links inside the player can't take visitors away.
    : `<iframe src="${esc(e.src)}" title="${esc(m.title)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
  document.getElementById("vcap").textContent = [m.title, m.subtitle].filter(Boolean).join(" · ");
  box.hidden = false; document.body.style.overflow = "hidden"; box.querySelector("[data-close-video]").focus();
}
function closeVideo(){ const box = document.getElementById("vmodal"); if (!box || box.hidden) return; box.hidden = true; document.getElementById("vframe").innerHTML = ""; document.body.style.overflow = ""; }

/* ============ Shared blocks ============ */
function seatCard(){
  const open = earlyOpen(), s = SEATS_LEFT(), lim = cfg().seatLimit, cta = CTA();
  if (!DEP()) return `<aside class="seat-card" aria-label="Price">${open?`<span class="pill green" style="align-self:flex-start">${esc(cfg().offerLabel)} · closes ${esc(EARLY_DATE())}</span><div class="price">${naira(PRICE_EARLY())}<small>paid once</small></div><p class="then">${esc(cfg().outrightCopy)}</p>`:`<span class="pill" style="align-self:flex-start">Monthly plan</span><div class="price">${naira(PRICE_MONTH())}<small>a month</small></div><p class="then">${esc(cfg().instalmentCopy)}</p>`}<a class="btn green block" href="${cta.href}" data-ga-enrol="hero">${cta.label}</a><p class="fine">Secure checkout · pay from anywhere</p></aside>`;
  return `<aside class="seat-card" aria-label="Reserve your seat">
${open?`<span class="pill green" style="align-self:flex-start">${esc(cfg().offerLabel)} · closes ${esc(EARLY_DATE())}</span>`:`<span class="pill" style="align-self:flex-start">Monthly plan</span>`}
<div class="price">${P$("deposit")}<small>today</small></div>
${open?`<p class="then">Then <b>${P$("earlyBal")} by ${esc(BAL_DATE())}</b>. That is <b>${P$("early")}</b> for the full bootcamp.</p><div class="save"><strong>Save ${P$("save")}</strong> compared with the monthly plan (${P$("monthlyTotal")})</div>`
      :`<p class="then"><b>${P$("monthly")} by ${esc(shortDate(COHORT_START()) || COHORT_START())}</b>, then ${P$("monthly")} on 1 December and 1 January.</p>`}
${open ? `<p class="seats-left">${SEATS_SHOWN() !== null ? `<span class="livedot" aria-hidden="true"></span><b class="js-seats-left">${SEATS_SHOWN()}</b> early-bird seats left` : `<span class="livedot" aria-hidden="true"></span>Limited early-bird seats`}</p>` : ""}
<a class="btn green block" href="${cta.href}" data-ga-enrol="hero">${cta.label}</a>
${FULL() ? `<div class="or"><span>or</span></div>${fullBtn("hero", "btn deep block")}<p class="fine full-note">One payment, nothing more to pay later.</p>` : ""}
<p class="fine">Prices in ${curSelect()} · <a href="/#pricing">See ${open?"the monthly plan":"all plans"}</a></p>
<p class="fine charge-note" data-charge-note hidden></p></aside>`;
}
function plansBlock(){
  const open = earlyOpen(), H = HOME().pricing;
  const eb = cfg().earlyBirdEnabled;
  const early = DEP()
    ? `<article class="plan${open?" best":" off"}" aria-labelledby="p-early">${open?`<span class="flag">Save ${P$("save")}</span>`:""}<div class="stack" style="gap:6px"><h3 id="p-early">${esc(cfg().offerLabel)}, paid once</h3><p class="muted small">${open?`Closes ${esc(EARLY_DATE())}${cfg().seatLimit?", or sooner if seats run out":""}.`:"This offer has closed."}</p></div>
<div class="total">${P$("early")}<small>in total</small></div><ul class="sched"><li class="today"><span>Today, to reserve your seat</span><b>${P$("deposit")}</b></li><li><span>By ${esc(BAL_DATE())}</span><b>${P$("earlyBal")}</b></li></ul>
${open?`<div class="plan-ctas"><a class="btn green block" href="/checkout?plan=early" data-ga-enrol="pricing_full"><span>Pay ${P$("early")} in full now</span></a><a class="btn block" href="/checkout?plan=deposit-early" data-ga-enrol="pricing"><span>Or reserve with ${P$("deposit")}</span></a></div>`:`<span class="btn ghost block" aria-disabled="true">${esc(cfg().offerLabel)} has closed</span>`}</article>`
    : `<article class="plan${open?" best":" off"}"><div class="stack" style="gap:6px"><h3>${esc(cfg().offerLabel)}, paid once</h3><p class="muted small">${open?`Until ${esc(EARLY_DATE())}.`:"This offer has closed."}</p></div><div class="total">${P$("early")}<small>paid once</small></div>${open?`<a class="btn green block" href="/checkout?plan=early" data-ga-enrol="pricing"><span>Pay ${P$("early")}</span></a>`:`<span class="btn ghost block" aria-disabled="true">Closed</span>`}</article>`;
  const monthly = DEP()
    ? `<article class="plan${open?"":" best"}" aria-labelledby="p-monthly"><div class="stack" style="gap:6px"><h3 id="p-monthly">Monthly plan</h3><p class="muted small">${P$("monthly")} a month for ${cfg().instalmentCount} months.</p></div>
<div class="total">${P$("monthlyTotal")}<small>in total</small></div><ul class="sched"><li class="today"><span>By ${esc(startShort())}</span><b>${P$("monthly")}</b></li><li><span>1 December</span><b>${P$("monthly")}</b></li><li><span>1 January</span><b>${P$("monthly")}</b></li></ul>
<a class="btn${open?"":" green"} block" href="/checkout?plan=monthly" data-ga-enrol="pricing"><span>Start the monthly plan for ${P$("monthly")}</span></a></article>`
    : `<article class="plan${open?"":" best"}"><div class="stack" style="gap:6px"><h3>Monthly plan</h3><p class="muted small">${cfg().instalmentCount} equal payments.</p></div><div class="total">${P$("monthly")}<small>a month</small></div><a class="btn block" href="/checkout?plan=monthly" data-ga-enrol="pricing"><span>Start with ${P$("monthly")}</span></a></article>`;
  return `<div class="cur-row"><span>Showing prices in</span>${curSelect()}<span class="muted" data-cur-note></span></div>
<div class="plans">${eb?early:""}${monthly}</div>
<p class="small muted charge-note" data-charge-note hidden></p>
${DEP()?`<div class="guarantee">${svg("shield")}<div><b>${T(H.guaranteeTitle)}</b>${T(H.guarantee)}</div></div>`:""}
<div class="paybox"><div class="globe">${svg("globe")}</div><div><b style="color:var(--ink)">Pay from anywhere in the world</b><p class="small muted">Join live classes from anywhere in the world. <span id="payText">Pay in naira by bank transfer, USSD or card, or use any international Visa or Mastercard.</span></p><div class="methods" id="payMethods"></div></div></div>
<p class="small muted">See the <a href="/payment-policy">payment policy</a>. Trouble paying? <a href="${wa("Hello Nerdy Pixels Academy, I'm having trouble paying.")}" target="_blank" rel="noopener" data-ga-whatsapp>Message us on WhatsApp</a>.</p>`;
}
function freeClassForm(){
  return `<form class="free" data-form="freeclass" novalidate>
<label class="f">Full name<input name="name" autocomplete="name" maxlength="80" required></label>
<label class="f">WhatsApp number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="Include your country code" maxlength="30" required></label>
<label class="f">Email<input name="email" type="email" inputmode="email" autocomplete="email" maxlength="200" required></label>
<label class="f">Which best describes you?${personaSelect("")}</label>
<button class="btn deep block" type="submit">Save my free seat</button>
<p class="fine">We'll send your joining link by email and WhatsApp.</p>
<div class="ok" hidden>You're registered. Your joining link is on its way to your email and WhatsApp.</div></form>`;
}
function eventBand(){
  const f = FREE(), H = HOME().freeClass;
  if (f.past || !f.at) return `<div class="band"><div class="stack" style="gap:12px"><span class="eyebrow">Free live class</span><h2>Not ready to commit? Join our next free class.</h2><p class="lead">${T(H.lead)}</p></div><div class="stack" style="gap:10px"><a class="btn deep block" href="${wa("Hello, please tell me when the next free class is.")}" target="_blank" rel="noopener">Tell me about the next one</a></div></div>`;
  return `<div class="band"><div class="stack" style="gap:12px"><span class="eyebrow">Free live class · ${esc(f.dateLabel.replace(/ \d{4}$/,""))}, ${esc(f.timeLabel)}</span><h2>${esc(f.title)}</h2><p class="lead">${T(H.lead)}</p></div>
<div class="stack" style="gap:10px"><a class="btn deep block" href="/events/first-marketing-strategy" data-ga-free-event>Save my free seat</a><p class="small muted" style="text-align:center">Online. Replay and template sent to everyone who registers.</p></div></div>`;
}
const LI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>';
/* Instructors: tall portrait cards (grid on desktop, swipeable on phones). */
function instructors(){
  const list = HOME().instructors.items || [];
  const ini = n => String(n).trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
  const safeLink = u => /^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(u || "") ? u : "";
  const card = (i, k) => { const li = safeLink(i.linkedin); const src = i.photo || "";
    const m = src.match(/^(\/brand\/instructors\/.+)-720\.webp$/);
    const img = src ? `<img src="${esc(src)}"${m?` srcset="${m[1]}-400.webp 400w, ${esc(src)} 720w" sizes="(max-width:640px) 78vw, (max-width:1100px) 33vw, 25vw"`:""} alt="${esc(i.name)}" width="720" height="900" loading="lazy" decoding="async">` : `<span class="ins-initials" aria-hidden="true">${esc(ini(i.name))}</span>`;
    return `<article class="ins-card" data-reveal style="--i:${k}"><div class="ins-photo">${img}</div><div class="ins-info"><h3>${esc(i.name)}</h3><p>${esc(i.role)}${i.org?` <span class="ins-org">· ${esc(i.org)}</span>`:""}</p>${li?`<a class="ins-li" href="${esc(li)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(i.name)} on LinkedIn">${LI}<span>LinkedIn</span></a>`:""}</div></article>`; };
  return `<div class="ins-rail" tabindex="0" aria-label="Instructors">${list.map(card).join("")}</div>${list.length > 1 ? `<p class="ins-hint" aria-hidden="true">Swipe to meet all ${list.length} instructors →</p>` : ""}`;
}
function modulesList(){
  return MODULES.map(m=>`<article class="card module"><div class="num" aria-hidden="true">${m[0]}</div><div class="stack" style="gap:6px"><h3>Module ${m[0]}: ${m[1]}</h3><p class="muted">${m[2]}</p>${m[4]?MOD_CERT:""}</div><div class="out"><span>Portfolio output</span>${m[3]}</div></article>`).join("")
   + `<article class="card module dark" style="border:0"><div class="num" style="background:var(--purple);color:#fff">★</div><div class="stack" style="gap:6px"><h3>Capstone hackathon</h3><p style="color:var(--on-dark)">Work in a team on a live brief across industry tracks, present to a panel, and add the result to your portfolio.</p></div></article>`;
}
function faqBlock(items, openFirst){
  return items.map((q,i)=>`<details class="faq"${openFirst&&i<2?" open":""}><summary><span>${q[0]}</span></summary><p>${q[1]}</p></details>`).join("");
}
function tel(dial, value){ return `<span class="tel"><span aria-hidden="true">${esc(dial)}</span><input type="tel" name="phone" autocomplete="tel-national" inputmode="tel" value="${esc(value||"")}" placeholder="801 234 5678" aria-label="WhatsApp number"></span>`; }
const personaSelect = v => `<select name="persona" required><option value="">Select one</option>${[["switcher","Switching careers"],["graduate","Recent graduate"],["marketer","Already doing marketing at work"],["owner","Business owner"],["others","Other"]].map(o=>`<option value="${o[0]}"${o[0]===v?" selected":""}>${o[1]}</option>`).join("")}</select>`;
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const digits = s => String(s||"").replace(/\D/g,"");
function formError(form, msg){
  let box = form.querySelector(".err");
  if (!msg){ if (box) box.remove(); return; }
  if (!box){ box = document.createElement("p"); box.className = "err"; box.setAttribute("role","alert"); const btn = form.querySelector("[type=submit]"); btn.parentNode.insertBefore(box, btn); }
  box.textContent = msg; box.scrollIntoView({block:"center",behavior:"smooth"});
}
const TOPICS = ["SEO","Social media marketing","Google Ads","Meta ads","Web analytics","Content strategy","Email marketing","AI marketing tools","Brand projects","Career launch"];
function marquee(){ const t = TOPICS.map(x=>`<span>${x}</span>`).join(""); return `<section class="marquee" aria-label="What you'll learn"><div class="marquee-track">${t}</div><div class="marquee-track" aria-hidden="true">${t}</div></section>`; }
function logosStrip(label){
  const logos = (cfg().media || []).filter(m => m.kind === "logo" && m.image_url);
  if (!logos.length) return "";
  const row = hide => logos.map(l => `<img src="${esc(l.image_url)}" alt="${hide?"":esc(l.title)}" height="96" loading="lazy" decoding="async">`).join("");
  return `<section class="logos" aria-label="Where our alumni work"><p class="lbl">${esc(label)}</p><div class="logo-marquee"><div class="logo-track">${row(false)}</div><div class="logo-track" aria-hidden="true">${row(true)}</div></div></section>`;
}
/* Stats: live numbers from the backend, or values typed in the builder. Animated on scroll. */
function daysToStart(){ const d = Date.parse(String(COHORT_START()).replace(/^[A-Za-z]+,?\s+/, "") + " 09:00 GMT+0100"); return Number.isNaN(d) ? null : Math.max(0, Math.ceil((d - Date.now()) / 864e5)); }
function statsBlock(){
  const items = (HOME().stats.items || []).map(s => {
    let v = s.value;
    if (s.live === "seats_left") v = earlyOpen() && SEATS_SHOWN() !== null ? String(SEATS_SHOWN()) : "";
    if (s.live === "days_to_start") { const d = daysToStart(); v = d ? String(d) : ""; }
    if (s.live === "seat_limit") v = cfg().seatLimit ? String(cfg().seatLimit) : "";
    v = String(v || "").replace(/\{seatsLeft\}/, SEATS_SHOWN() ?? "");
    return v ? { v, label: s.label, live: s.live } : null;
  }).filter(Boolean);
  if (!items.length) return "";
  return `<section class="stats-strip" aria-label="At a glance"><div class="wrap"><div class="stat-grid">${items.map(s => { const n = parseFloat(String(s.v).replace(/,/g, "")); const suf = String(s.v).replace(/^[\d,.]+/, ""); return `<div class="stat${s.live?" live":""}">${s.live?`<span class="livedot" aria-hidden="true"></span>`:""}<b${Number.isFinite(n)?` data-count="${n}" data-suffix="${esc(suf)}"`:""}>${esc(s.v)}</b><span>${esc(s.label)}</span></div>`; }).join("")}</div></div></section>`;
}
function stickyBar(){ const cta = CTA(), open = earlyOpen(); return `<div class="sticky" id="sticky" aria-hidden="true"><div class="wrap"><div class="t">${DEP()?(open?`${P$("early")} for the full bootcamp<span class="sub">Reserve your seat for ${P$("deposit")} · closes ${esc(EARLY_DATE())}</span>`:`Reserve your seat for ${P$("deposit")}<span class="sub">Classes start ${esc(COHORT_START())}</span>`):`${naira(open?PRICE_EARLY():PRICE_MONTH())} ${open?esc(cfg().offerLabel):"a month"}<span class="sub">Classes start ${esc(COHORT_START())}</span>`}</div><a class="btn green sm" href="${cta.href}" tabindex="-1" data-ga-enrol="sticky_bar">${cta.short}</a></div></div>`; }
/* ============ Pages ============ */
const P = {};

P.home = () => { const H = HOME(), open = earlyOpen(), cta = CTA(), f = FREE();
  const testimonials = (cfg().media || []).filter(m => m.kind === "testimonial");
  const recordings = (cfg().media || []).filter(m => m.kind === "class_recording");
  const recording = recordings.find(m => embedFor(m.video_url)) || recordings[0];
  const recPlayable = recording && embedFor(recording.video_url);
  const sec = (k, html) => H[k] && H[k].show !== false ? html : "";
  const head = (eyebrow, title, lead, id, extra = "") => `<div class="head"><div class="stack">${eyebrow?`<span class="eyebrow">${T(eyebrow)}</span>`:""}<h2${id?` id="${id}"`:""}>${T(title)}</h2>${lead?`<p class="lead">${T(lead)}</p>`:""}</div>${extra}</div>`;
  return { title:"Nerdy Pixels Academy | Digital Marketing Bootcamp", main:"home", html:`
${sec("hero", `<section class="hero" aria-labelledby="hero-title">${H.hero.image?`<div class="hero-bg" aria-hidden="true">${pic(H.hero.image, "", { eager:true, sizes:"100vw", w:1920, h:1280 })}</div>`:""}
<div class="wrap hero-grid"><div class="stack" style="gap:22px"><p class="kicker-line">${T(H.hero.kicker)}</p>
<h1 id="hero-title">${nobreak(T(H.hero.title))} <span class="accent">${nobreak(T(H.hero.accent))}</span></h1>
<p class="lead">${T(H.hero.lead)}</p>
<div class="row actions" style="gap:18px"><a class="btn green" href="${cta.href}" data-ga-enrol="hero">${cta.label}</a>${f.at && !f.past?`<a class="secondary" href="#free-class" data-ga-free-event>${T(H.hero.secondary)}</a>`:""}</div>
<ul class="trust" aria-label="Good to know">${(H.hero.trust||[]).filter(t=>t.text && (DEP() || !/\{deposit\}/.test(t.text))).map(t=>`<li>${svg("check")}<span>${T(t.text)}</span></li>`).join("")}</ul></div>
${seatCard()}</div></section>`)}
${sec("logos", logosStrip(H.logos.label))}
${marquee()}
${sec("stats", statsBlock())}
${sec("results", `<section class="section" id="results" aria-labelledby="proof-title" style="padding-top:clamp(32px,5vw,56px)"><div class="wrap stack" style="gap:28px">${head(H.results.eyebrow, H.results.title, H.results.lead, "proof-title")}
${testimonials.length?`<div class="vgrid">${testimonials.map(vcard).join("")}</div>`:""}
<div class="proof-strip" aria-label="Last cohort in numbers">${(H.results.strip||[]).map(s=>`<span><b>${esc(s.value)}</b>${esc(s.label)}</span>`).join("")}</div></div></section>`)}
${sec("problems", `<section class="section tint" aria-labelledby="gap-title"><div class="wrap stack" style="gap:28px">${head(H.problems.eyebrow, H.problems.title, H.problems.lead, "gap-title")}
<div class="grid g2">${(H.problems.items||[]).map((p,i)=>`<div class="card prob"><span class="n">${i+1}</span><div class="stack" style="gap:6px"><h3>${T(p.title)}</h3><p class="muted">${T(p.text)}</p></div></div>`).join("")}</div></div></section>`)}
${sec("curriculum", `<section class="section" id="curriculum" aria-labelledby="learn-title"><div class="wrap stack" style="gap:28px">${head("", H.curriculum.title, H.curriculum.lead, "learn-title", `<div class="row" style="gap:10px">${cfg().hasSyllabus?`<button class="btn ghost sm" type="button" data-open="syllabus">Download the syllabus</button>`:""}<a class="headlink" href="/curriculum">See the full curriculum →</a></div>`)}
<div class="mods">${(H.curriculum.modules||[]).map((m,i)=>`<div class="mod"><span class="n">Module ${i+1}</span><b>${esc(m.name)}</b></div>`).join("")}</div>
<div class="split">${H.curriculum.image?`<div class="split-img">${pic(H.curriculum.image, "A student studying programming")}</div>`:""}<div class="stack" style="gap:16px"><div class="stack" style="gap:6px"><span class="eyebrow">Learning outcomes</span><h3 style="font-size:22px">${T(H.curriculum.outcomesTitle)}</h3></div>
<ol class="outcomes">${(H.curriculum.outcomes||[]).map(o=>`<li>${T(o.text)}</li>`).join("")}</ol></div></div></div></section>`)}
${sec("outcomes", `<section class="section tint" aria-labelledby="leave-title"><div class="wrap split">${H.outcomes.image?`<div class="split-img">${pic(H.outcomes.image, "Bootcamp students working together on a laptop")}</div>`:""}<div class="stack" style="gap:28px">${head("", H.outcomes.title, H.outcomes.lead, "leave-title")}
<div class="grid g2">${(H.outcomes.items||[]).map((o,i)=>`<div class="card outcome"><div class="ico">${svg(["folder","badge","brand","chart"][i%4])}</div><div class="stack" style="gap:4px"><h3>${T(o.title)}</h3><p class="muted">${T(o.text)}</p></div></div>`).join("")}</div></div></div></section>`)}
${sec("personas", `<section class="section" aria-labelledby="for-title"><div class="wrap stack" style="gap:28px"><h2 id="for-title">${T(H.personas.title)}</h2>
<div class="grid g4">${(H.personas.items||[]).map((p,i)=>`<div class="card persona">${p.image?`<div class="pimg"><div class="pimg-in">${pic(p.image, "", { sizes:"(max-width:640px) 100vw, (max-width:900px) 50vw, 25vw" })}</div><span class="nbadge">${i+1}</span></div>`:`<span class="nbadge">${i+1}</span>`}<div class="stack" style="gap:8px"><h3>${T(p.title)}</h3><p class="muted">${T(p.text)}</p></div></div>`).join("")}</div></div></section>`)}
${sec("tools", `<section class="section tint" id="tools" aria-labelledby="tools-title"><div class="wrap stack" style="gap:28px">${head(H.tools.eyebrow, H.tools.title, H.tools.lead, "tools-title")}
<div class="tool-orbit" aria-hidden="true"><div class="orbit-track">${[...(H.tools.ai||[]), ...(H.tools.marketing||[])].concat([...(H.tools.ai||[]), ...(H.tools.marketing||[])]).filter(x=>x.logo).map(x=>`<span class="orbit-logo" style="--brand:${esc(/^#[0-9a-f]{3,8}$/i.test(x.color||"")?x.color:"#7d2ae8")}"><img src="${esc(x.logo)}" alt="" width="28" height="28" loading="lazy"></span>`).join("")}</div></div>
<div class="toolgroups">${[["AI tools", H.tools.ai], ["Marketing and analytics tools", H.tools.marketing]].map(([t, list], gi)=>`<div class="toolgroup" data-reveal><h3>${t}</h3><div class="chips">${(list||[]).map((x,i)=>{ const c = /^#[0-9a-f]{3,8}$/i.test(x.color||"") ? x.color : "#7d2ae8"; return `<span class="chip" data-reveal style="--brand:${esc(c)};--i:${gi*5+i}"><i>${x.logo?`<img src="${esc(x.logo)}" alt="" width="22" height="22" loading="lazy" decoding="async">`:esc(String(x.name).replace(/[^A-Za-z0-9]/g,"").slice(0,2))}</i><span>${esc(x.name)}<small>${esc(x.use)}</small></span></span>`; }).join("")}</div></div>`).join("")}</div>
${H.tools.image?`<div class="wide-img">${pic(H.tools.image, "A marketer planning a campaign in a modern office", { sizes:"(max-width:760px) 100vw, 1200px" })}</div>`:""}
<div class="certrow"><span class="small muted" style="font-weight:600">Certifications included:</span>${(H.tools.certs||[]).map(c=>`<span>${esc(c.name)}</span>`).join("")}</div></div></section>`)}
${sec("instructors", `<section class="section ins-section" aria-labelledby="inst-title"><div class="wrap stack" style="gap:28px">${head(H.instructors.eyebrow, H.instructors.title, H.instructors.lead, "inst-title")}${instructors()}</div></section>`)}
${sec("pricing", `<section class="section tint" id="pricing" aria-labelledby="price-title"><div class="wrap stack" style="gap:36px">${head(H.pricing.eyebrow, DEP() ? H.pricing.title : "Choose how you pay", DEP() ? H.pricing.lead : `Same bootcamp, same certifications. Pay once or spread it over ${cfg().instalmentCount} months.`, "price-title")}${plansBlock()}</div></section>`)}
${sec("inside", recording ? `<section class="section" id="see-inside" aria-labelledby="inside-title" style="padding-bottom:0"><div class="wrap stack" style="gap:24px">${head(H.inside.eyebrow, H.inside.title, H.inside.lead, "inside-title")}
${recPlayable?`<button type="button" class="vthumb big" data-video="${esc(recording.id)}" aria-label="Play ${esc(recording.title)}">`:`<div class="vthumb big">`}${pic(recording.image_url || "/brand/photos/class-recording-1200.webp", "", { sizes:"(max-width:960px) 100vw, 960px" })}${recPlayable?`<span class="play">${svg("play")}</span>`:`<span class="soon">Full class recording coming soon</span>`}<span class="cap"><span>${esc(recording.title)}</span><span>${esc(recording.subtitle || "")}</span></span>${recPlayable?"</button>":"</div>"}</div></section>` : "")}
${sec("freeClass", f.at && !f.past ? `<section class="section" id="free-class" aria-labelledby="free-title"><div class="wrap"><div class="band">
<div class="stack" style="gap:16px"><span class="eyebrow">Free live class · ${esc(f.dateLabel.replace(/ \d{4}$/,""))}, ${esc(f.timeLabel)}</span><h2 id="free-title">Not ready to commit? ${esc(f.title)} with us.</h2><p class="lead">${T(H.freeClass.lead)}</p>
<ul class="gets">${(H.freeClass.gets||[]).map(g=>`<li>${svg("check")}<span>${T(g.text)}</span></li>`).join("")}</ul>${H.freeClass.image?`<div class="band-img">${pic(H.freeClass.image, "Young professionals reviewing a marketing plan together")}</div>`:""}</div>
${freeClassForm()}</div></div></section>` : "")}
${sec("faq", `<section class="section tint" aria-labelledby="faq-title"><div class="wrap stack" style="gap:28px"><h2 id="faq-title">${T(H.faq.title)}</h2><div class="faq">${(H.faq.items||[]).filter(x => DEP() || !/\{(deposit|earlyBalance|balanceDue)\}/.test(x.q + x.a)).map(x=>`<details><summary><span>${T(x.q)}</span></summary><p>${T(x.a)}</p></details>`).join("")}</div></div></section>`)}
${sec("final", `<section class="final" aria-labelledby="final-title">${H.final.image?`<div class="final-bg" aria-hidden="true">${pic(H.final.image, "", { sizes:"100vw", w:1920, h:1280 })}</div>`:""}<div class="wrap inner">
${open?`${SEATS_SHOWN()!==null?`<span class="tag">Only <span class="js-seats-left">${SEATS_SHOWN()}</span> ${esc(cfg().offerLabel.toLowerCase())} seats left</span>`:`<span class="tag">Limited ${esc(cfg().offerLabel.toLowerCase())} seats</span>`}<h2 id="final-title">${esc(cfg().offerLabel)} closes ${esc(EARLY_DATE())}.</h2>
<div class="clock" data-clock="${esc(cfg().earlyBirdDeadline)}" aria-label="Time until the offer closes"><div><b data-u="d">00</b><span>days</span></div><div><b data-u="h">00</b><span>hours</span></div><div><b data-u="m">00</b><span>minutes</span></div></div>`
  :`<h2 id="final-title">The next cohort starts ${esc(COHORT_START())}.</h2>`}
<a class="btn green" href="${cta.href}" data-ga-enrol="section_cta">${cta.label}</a>
<p class="wa">Questions? <a href="${wa("Hello Nerdy Pixels Academy, I'd like to know more about the bootcamp.")}" target="_blank" rel="noopener" data-ga-whatsapp>Chat with us on WhatsApp</a> · ${SITE.phoneLabel}</p></div></section>`)}
${stickyBar()}`};
};

P.courses = () => ({ title:"Courses | Nerdy Pixels Academy", html:`
<section class="hero"><div class="wrap stack" style="gap:16px"><h1>Courses</h1><p class="lead">Start with the flagship bootcamp, or join the waitlist for a specialist programme.</p></div></section>
<section class="section"><div class="wrap stack" style="gap:28px">
<article class="card course-feature">
<div class="stack" style="gap:12px"><span class="pill green" style="align-self:flex-start">Enrolling now</span><h2>${esc(cfg().courseTitle)}</h2><p class="lead">Eight modules, five certifications, live classes Thursday to Sunday and a capstone hackathon. The next cohort starts ${esc(COHORT_START())}.</p>
<div class="row"><a class="btn" href="/courses/digital-marketing">View the bootcamp</a><a class="btn ghost" href="/curriculum">See the curriculum</a></div></div>
<div class="stack" style="gap:8px;justify-content:center">${DEP()?`<div class="price">${P$("deposit")}<small>to reserve your seat</small></div><p class="muted">Then ${earlyOpen()?`${P$("earlyBal")} by ${esc(BAL_DATE())} (${P$("early")} in total)`:`${P$("monthly")} a month`}.</p>`:`<div class="price">${naira(earlyOpen()?PRICE_EARLY():PRICE_MONTH())}<small>${earlyOpen()?"paid once":`a month for ${cfg().instalmentCount} months`}</small></div>`}</div>
</article>
<h2 style="margin-top:12px">Specialist programmes</h2>
<div class="grid g3">${COURSES.map(c=>`<div class="card stack" style="gap:10px"><span class="pill" style="align-self:flex-start">${c.weeks}</span><h3>${c.name}</h3><p class="muted">${c.text}</p><a class="btn ghost sm" style="margin-top:auto;align-self:flex-start" href="/waitlist/${c.slug}">Join the waitlist</a></div>`).join("")}</div>
</div></section>`});

P.bootcamp = () => { const open = earlyOpen(), cta = CTA(); const faqs = FAQS(); return { title:"Digital Marketing Bootcamp, next cohort | Nerdy Pixels Academy", html:`
<nav class="subnav" aria-label="On this page"><div class="wrap"><b>${esc(cfg().courseTitle)}</b>${[["overview","Overview"],["curriculum","Curriculum"],["certifications","Certifications"],["pricing","Pricing"],["event","Free class"],["faq","FAQ"]].map(a=>`<a href="/courses/digital-marketing?s=${a[0]}">${a[1]}</a>`).join("")}</div></nav>
<section class="hero" id="overview"><div class="hero-bg" aria-hidden="true">${pic("/brand/photos/hero-neon-1920.webp", "", { eager:true, sizes:"100vw", w:1920, h:1280 })}</div><div class="wrap hero-grid">
<div class="stack" style="gap:22px"><p class="kicker-line">${esc(cfg().courseTitle)} · the next cohort starts ${esc(COHORT_START())}</p>
<h1>${esc(cfg().headline)}</h1>
<p class="lead">Eight practical modules taught live by working marketers. Every module ends with a portfolio piece, and you finish with a live project for a real brand.</p>
<div class="row actions" style="gap:18px"><a class="btn green" href="${cta.href}" data-ga-enrol="hero">${cta.label}</a><a class="secondary" href="/curriculum">See the curriculum →</a></div>
<ul class="trust">${["Live classes Thursday to Sunday","Pay from anywhere in the world","Monthly plan available"].map(t=>`<li>${svg("check")}${t}</li>`).join("")}</ul></div>
${seatCard()}</div></section>
${statsBlock()}
<section class="section"><div class="wrap stack" style="gap:28px"><h2>Built for four kinds of people</h2><div class="grid g4">${(HOME().personas.items||[]).map((p,i)=>`<div class="card persona">${p.image?`<div class="pimg">${pic(p.image, "", { sizes:"(max-width:640px) 100vw, 25vw" })}<span class="nbadge">${i+1}</span></div>`:""}<div class="stack" style="gap:8px"><h3>${esc(p.title)}</h3><p class="muted">${esc(p.text)}</p></div></div>`).join("")}</div></div></section>
<section class="section tint" id="curriculum"><div class="wrap stack" style="gap:24px">
<div class="head"><div class="stack" style="gap:8px"><h2>What you'll learn, and what you'll build</h2><p class="lead">One module a week. Monday to Wednesday is self-paced certification work; Thursday to Sunday is live classes and practice.</p></div><div class="row" style="gap:10px">${cfg().hasSyllabus?`<button class="btn ghost sm" type="button" data-open="syllabus">Download the syllabus</button>`:""}<a class="headlink" href="/curriculum">See the full weekly plan</a></div></div>
<div class="stack" style="gap:14px">${modulesList()}</div></div></section>
<section class="section dark" id="certifications"><div class="wrap stack" style="gap:28px">
<div class="stack" style="gap:12px;max-width:760px"><h2>Five certifications in one programme</h2><p style="font-size:17px">Earn industry-recognised certifications module by module, plus our certificate of completion when you finish.</p></div>
<div class="grid g3">${[["Earned as you go","Certification work is built into the modules, Monday to Wednesday."],["Recognised by employers","Proof of skill that hiring managers and clients already know."],["Ready for your CV","Add each one to your CV and LinkedIn as soon as you pass."]].map(c=>`<div class="card stack" style="gap:8px">${I.check("#25D366",24)}<h3 style="font-size:17px">${c[0]}</h3><p class="small">${c[1]}</p></div>`).join("")}</div></div></section>
<section class="section tint" id="pricing"><div class="wrap stack" style="gap:28px"><div class="stack" style="gap:8px"><h2>${DEP()?T(HOME().pricing.title):"Choose how you pay"}</h2><p class="lead">${DEP()?T(HOME().pricing.lead):`Same bootcamp, same certifications. Pay once or spread it over ${cfg().instalmentCount} months.`}</p></div>${plansBlock()}</div></section>
<section class="section" id="event"><div class="wrap">${eventBand()}</div></section>
<section class="section tint"><div class="wrap stack" style="gap:28px"><h2>Taught by working marketers</h2>${instructors()}</div></section>
<section class="section" id="faq"><div class="wrap grid faq-grid">
<div class="stack" style="gap:14px"><h2>Questions, answered</h2><p class="muted">Still unsure? Talk to an advisor on WhatsApp and get an answer the same day.</p><a class="btn green" style="align-self:flex-start" href="${wa("Hello, I have a question about the Digital Marketing Bootcamp.")}" target="_blank" rel="noopener" data-ga-whatsapp>${I.wa()} Chat with an advisor</a><a href="/faq" style="font-weight:600">See all FAQs</a></div>
<div class="stack" style="gap:12px">${faqBlock(faqs[0][1].slice(0,3).concat(faqs[1][1].slice(0,3)), true)}</div></div></section>
<section class="final"><div class="wrap inner"><h2>The next cohort starts ${esc(COHORT_START())}.</h2><a class="btn green" href="${cta.href}" data-ga-enrol="section_cta">${cta.label}</a></div></section>
${stickyBar()}`};};

P.curriculum = () => ({ title:"Curriculum | Digital Marketing Bootcamp | Nerdy Pixels Academy", html:`
<section class="hero"><div class="wrap stack" style="gap:16px"><p class="kicker-line">Professional Digital Marketing Bootcamp</p><h1>The curriculum, week by week</h1><p class="lead">Eight modules and a capstone hackathon. Each week you learn one discipline, practise it live, and add a finished piece to your portfolio.</p><div class="row actions" style="gap:18px"><a class="btn green" href="${CTA().href}" data-ga-enrol="hero">${CTA().label}</a>${cfg().hasSyllabus?`<button class="btn ghost-light" type="button" data-open="syllabus">Download the syllabus</button>`:`<a class="secondary" href="/courses/digital-marketing">Back to the bootcamp →</a>`}</div></div></section>
<section class="section"><div class="wrap stack" style="gap:24px"><h2>How a week works</h2>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${[["Mon to Wed","Self-paced","Certification lessons and reading, at your own pace."],["Thursday","Live class","Core concepts for the week."],["Friday","Live class","Going deeper, with the tools."],["Saturday","Live class","Applying it to real examples."],["Sunday","Build session","Your portfolio piece, with feedback."]].map((r,i)=>`<div class="card stack" style="gap:6px;${i?"background:var(--deep);border-color:var(--deep);color:#fff":""}"><b style="font-size:17px;${i?"color:#fff":"color:var(--ink)"}">${r[0]}</b><span class="small" style="font-weight:600;opacity:.85">${r[1]}</span><span class="small">${r[2]}</span></div>`).join("")}</div>
<p class="muted small">Live classes are online. Session times and the holiday break are confirmed at orientation.</p></div></section>
<section class="section tint"><div class="wrap stack" style="gap:14px"><h2 style="margin-bottom:10px">Modules and portfolio outputs</h2>${modulesList()}</div></section>
<section class="section"><div class="wrap">${eventBand()}</div></section>`});

/* The schedule for the plan a student chose at checkout, in naira (from the cohort). */
function scheduleRows(plan){
  const d = cfg().depositAmount, e = PRICE_EARLY(), m = PRICE_MONTH(), b = BAL_DATE();
  if (plan === "deposit_early") return [["Seat deposit","Paid at enrolment"],["Early-bird balance",`${naira(e-d)} by ${b}`]];
  if (plan === "deposit_monthly") return [["Seat deposit","Paid at enrolment"],["Rest of the first month",`${naira(m-d)} by ${b}`],["December",`${naira(m)} by 1 Dec`],["January",`${naira(m)} by 1 Jan`]];
  if (plan === "early") return [["Early bird","Paid in full"]];
  return [["First month","Paid at enrolment"],["December",`${naira(m)} by 1 Dec`],["January",`${naira(m)} by 1 Jan`]];
}
P.onboarding = () => { const o = lastOf("orders"); const plan = o && o.plan; return { title:"Student onboarding | Nerdy Pixels Academy", html:`
<section class="section dark"><div class="wrap hero-grid">
<div class="stack" style="gap:16px"><span style="font-weight:600;color:#D2BCFF">Student onboarding</span><h1 style="color:#fff">${o?`Welcome, ${esc(o.first)}.`:`Welcome to the ${esc(cfg().courseTitle)}.`}</h1><p style="font-size:18px">Everything you need before your first class: your checklist, the weekly rhythm, the curriculum and your payment dates.</p></div>
<div class="card stack" style="gap:12px">${[["Orientation","Details sent by email and WhatsApp"],["First live class",COHORT_START()],...(DEP()?[["Balance due",BAL_DATE()]]:[]),["December instalment","Due 1 December"],["January instalment","Due 1 January"]].map(r=>`<div class="sumrow" style="border-bottom:1px solid var(--deep-line);padding-bottom:10px"><span style="color:var(--on-dark-2)">${r[0]}</span><b style="color:#fff">${esc(r[1])}</b></div>`).join("")}</div></div></section>
<section class="section tint" id="checklist"><div class="wrap grid faq-grid">
<div class="stack" style="gap:10px"><h2>Before your first class</h2><p class="muted">Six steps, about 30 minutes in total. Finish them before orientation.</p></div>
<ol class="list" style="gap:12px">${[["Join your cohort's WhatsApp group","Class links, reminders and announcements go here first.",`<a class="btn green sm" href="${cfg().whatsappLink || wa("Hello, I've enrolled in the bootcamp. Please add me to my cohort's WhatsApp group.")}" target="_blank" rel="noopener">${I.wa("#06301A",18)} Join my cohort's group</a>`],["Complete your student profile","Name for your certificate, country, and your goal for the bootcamp.",`<a class="btn ghost sm" href="https://forms.gle/9Yt5Pa5kT5F19MYN8" target="_blank" rel="noopener">Complete my profile</a>`],["Create your learning accounts","Set up the free certification platform accounts listed in your welcome email.",""],["Set up your tools","A laptop or smartphone with a stable internet connection and a Google account.",""],["Attend orientation","Meet your instructors and cohort, and get the week-by-week calendar.",""],["Save your payment dates","Your remaining payments and their due dates are in your student area.",`<a class="btn ghost sm" href="/student">Open my student area</a>`]].map((c,i)=>`<li class="card row" style="flex-wrap:nowrap;align-items:flex-start"><span class="avatar" style="width:36px;height:36px;font-size:15px">${i+1}</span><div class="stack" style="gap:8px"><b style="color:var(--ink)">${c[0]}</b><span class="muted">${c[1]}</span>${c[2]?`<div>${c[2]}</div>`:""}</div></li>`).join("")}</ol></div></section>
<section class="section"><div class="wrap stack" style="gap:16px"><h2>Your curriculum</h2><p class="lead">Eight modules and a capstone hackathon, one module a week.</p><div><a class="btn" href="/curriculum">Open the full curriculum</a></div></div></section>
<section class="section tint" id="payments"><div class="wrap grid g2" style="gap:32px;align-items:start">
<div class="stack" style="gap:12px"><h2>Your payments</h2><p class="lead">We email a reminder before each due date. Pay with the same methods you used at checkout, and see everything in your student area.</p></div>
<div class="card stack" style="gap:12px">${o?`<div class="sumrow"><span>Your plan</span><b>${esc(planName(plan))}</b></div>`:""}${scheduleRows(plan || "monthly").map(r=>`<div class="sumrow"><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join("")}<a class="btn block" href="/pay-instalment">Pay my next instalment</a></div></div></section>
<section class="section"><div class="wrap band"><div class="stack" style="gap:6px"><h2 style="font-size:26px">Need help getting set up?</h2><p>Message the student support team on WhatsApp or email ${SITE.email}.</p></div><a class="btn green" href="${wa("Hello, I need help with my bootcamp onboarding.")}" target="_blank" rel="noopener">${I.wa()} Message student support</a></div></section>`};};

P.event = () => { const f = FREE(), H = HOME().freeClass; return { title:f.title + " | Free class | Nerdy Pixels Academy", html:`
<section class="hero"><div class="hero-bg" aria-hidden="true">${pic("/brand/photos/free-class-1200.webp", "", { eager:true, sizes:"100vw" })}</div><div class="wrap hero-grid" style="align-items:start">
<div class="stack" style="gap:22px"><p class="kicker-line">Free live class</p><h1>${esc(f.title)}</h1>
<p class="lead">${T(H.lead)}</p>
${f.at?`<div class="grid g3">${[["Date",f.past?"Next date coming soon":f.dateLabel.replace(/ \d{4}$/,"")],["Time",f.past?"—":f.timeLabel],["Where","Online, free"]].map(r=>`<div class="glass"><div class="small">${r[0]}</div><b>${esc(r[1])}</b></div>`).join("")}</div>`:""}
<ul class="trust">${(H.gets||[]).map(g=>`<li>${svg("check")}<span>${T(g.text)}</span></li>`).join("")}</ul>
</div>
${f.past?`<div class="seat-card"><h2 style="font-size:24px">This class has happened</h2><p>Tell us on WhatsApp and we'll invite you to the next one.</p><a class="btn green block" href="${wa("Hello, please invite me to the next free class.")}" target="_blank" rel="noopener">Invite me to the next one</a></div>`:`<div class="seat-card"><h2 style="font-size:24px">Save your free seat</h2>${freeClassForm()}</div>`}</div></section>
<section class="section"><div class="wrap stack" style="gap:24px"><h2>Your hosts</h2><p class="lead">Led by Nerdy Pixels Academy instructors who run marketing for brands every day.</p>${instructors()}</div></section>`};};

P.eventDone = () => { const r = lastOf("events"); const f = FREE(), cta = CTA();
  const gcal = f.startUTC ? "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(f.title + " (Nerdy Pixels Academy)") + "&dates=" + f.startUTC + "/" + f.endUTC + "&details=" + encodeURIComponent("Free live class. Your joining link is in your email.") : "";
  return { title:"You're registered | Nerdy Pixels Academy", html:`
<section class="section"><div class="wrap" style="max-width:720px"><div class="stack" style="gap:20px">
<div class="ok-icon">${I.check("#0F7A3C",34)}</div>
<h1 style="font-size:clamp(30px,4vw,44px)">You're registered${r?", "+esc(r.first):""}.</h1>
<p class="lead">Your joining link for ${esc(f.title)} is on its way${r?" to "+esc(r.email):""}.${f.dateLabel?` It's on ${esc(f.dateLabel)} at ${esc(f.timeLabel)}.`:""}</p>
<div class="grid g2">${gcal?`<a class="btn deep" href="${gcal}" target="_blank" rel="noopener">Add to Google Calendar</a>`:""}<a class="btn green" href="${wa("Hi, I registered for " + f.title + ". Please send me reminders on WhatsApp.")}" target="_blank" rel="noopener">${I.wa()} Get reminders on WhatsApp</a></div>
<div class="card stack" style="gap:10px;margin-top:10px"><h2 style="font-size:22px">Ready for the full programme?</h2><p class="muted">${DEP()?`Reserve your seat for ${P$("deposit")}. Classes start ${esc(COHORT_START())}.`:`The next cohort starts ${esc(COHORT_START())}.`}</p><div class="row"><a class="btn" href="${cta.href}" data-ga-enrol="section_cta">${cta.label}</a><a class="btn ghost" href="/curriculum">See the curriculum</a></div></div>
<a href="/blog" style="font-weight:600">Read our beginner guides while you wait</a>
</div></div></section>`};};

/* ---------- Checkout ---------- */
const PLAN_PARAM = { "deposit-early":"deposit_early", "deposit-monthly":"deposit_monthly", deposit_early:"deposit_early", deposit_monthly:"deposit_monthly", early:"early", monthly:"monthly" };
function planName(p){ return { early:"Early bird, paid in full", monthly:"Monthly plan", deposit_early:`${cfg().offerLabel} with deposit`, deposit_monthly:"Monthly plan with deposit" }[p] || "Monthly plan"; }
function coState(){ const c = sget("npa-co") || { step:1, country:"NG", plan:null, method:null, name:"", email:"", phone:"", persona:"", source:"", ref:"", agree:false }; if (!c.ref){ try{ const r = localStorage.getItem("npa-ref"); if (r){ c.ref = r; sset("npa-co", c); } }catch(e){} } return c; }
function coSave(c){ sset("npa-co", c); }
function coPlan(c){
  let p = PLAN_PARAM[c.plan] || null;
  if (p === "deposit_monthly") p = "monthly"; // the monthly plan has no deposit
  if (!DEP() && p === "deposit_early") p = "early"; if (!DEP() && p === "deposit_monthly") p = "monthly";
  if (!p) p = earlyOpen() ? (DEP() ? "deposit_early" : "early") : "monthly";
  if ((p === "early" || p === "deposit_early") && !earlyOpen()) p = "monthly";
  return p;
}
/** Today's amount for a plan, in a given currency. */
function dueToday(plan, code){ const v = PV(code); return plan === "early" ? v.early : plan === "monthly" ? v.monthly : v.deposit; }
P.checkout = (q) => { const c = coState(); if (PLAN_PARAM[q.plan]) c.plan = PLAN_PARAM[q.plan]; if (!c.step || c.step>3) c.step=1; coSave(c);
  return { title:"Checkout | Nerdy Pixels Academy", html:`<section class="section" style="padding-top:40px"><div class="wrap co"><div id="co" class="stack" style="gap:26px"></div><aside id="co-sum" class="summary" aria-label="Order summary"></aside></div></section>`, mount: coRender };};
function coRender(){
  const c = coState(), plan = coPlan(c), ct = country(c.country), open = earlyOpen();
  const charged = chargeCode(), shown = CUR_CODE, today = dueToday(plan, shown), todayCharged = dueToday(plan, charged);
  const localMethods = charged === "NGN" && ct.code === "NG" ? ct.methods : charged === ct.cur ? ct.methods : [["card","Card",`Visa or Mastercard, charged in ${curRow(charged).label}`]];
  const method = localMethods.find(m=>m[0]===c.method) ? c.method : localMethods[0][0];
  const chargeNote = charged !== shown ? `<p class="small note">Shown in ${esc(curRow(shown).label)}. You'll be charged <b>${money(todayCharged, charged)}</b> in ${esc(curRow(charged).label)} on the secure payment screen.</p>` : "";
  const steps = `<ol class="steps" aria-label="Checkout steps">${["Plan","Your details","Payment"].map((s,i)=>`<li class="${c.step===i+1?"on":c.step>i+1?"done":""}"${c.step===i+1?' aria-current="step"':""}><i>${c.step>i+1?"✓":i+1}</i>${s}</li>`).join("")}</ol>`;
  const v = PV(shown), m$ = n => money(n, shown);
  const choice = (id, title, price, lines, disabled, note) => `<button type="button" role="radio" aria-checked="${plan===id}" class="choice ${plan===id?"on":""}" data-act="co-plan" data-v="${id}"${disabled?" disabled":""}><span class="radio"></span><span class="stack" style="gap:4px;flex:1"><span class="row" style="justify-content:space-between"><b style="font-size:18px;color:var(--ink)">${title}</b><b style="font-size:20px;color:var(--ink)">${price}</b></span>${lines}${note?`<span class="small" style="font-weight:700;color:var(--green-ink)">${note}</span>`:""}</span></button>`;
  const plans = DEP()
    ? (cfg().earlyBirdEnabled ? choice("early", `${esc(cfg().offerLabel)}, paid in full now`, m$(v.early), `<span class="small">One payment today. Nothing more to pay later.</span>`, !open, open ? `Save ${m$(v.save)} · best value, one payment` : "Offer has closed") : "")
      + (cfg().earlyBirdEnabled ? choice("deposit_early", `${esc(cfg().offerLabel)}, reserve with a deposit`, `${m$(v.early)} <span class="small muted" style="font-weight:500">total</span>`, `<span class="small">${m$(v.deposit)} today, then ${m$(v.earlyBal)} by ${esc(BAL_DATE())}.</span>`, !open, open ? `Save ${m$(v.save)}${SEATS_SHOWN()!==null?` · ${SEATS_SHOWN()} seats left`:""}` : "Offer has closed") : "")
      + choice("monthly", "Monthly plan", `${m$(v.monthly)} <span class="small muted" style="font-weight:500">a month</span>`, `<span class="small">${m$(v.monthly)} today (due by ${esc(startShort())}), then ${m$(v.monthly)} on 1 December and 1 January. ${m$(v.monthlyTotal)} in total.</span>`, false, "")
    : (cfg().earlyBirdEnabled ? choice("early", `${esc(cfg().offerLabel)}, paid once`, m$(v.early), `<span class="small">${esc(cfg().outrightCopy)}</span>`, !open, open ? "Available now" : "Offer has closed") : "")
      + choice("monthly", "Monthly plan", `${m$(v.monthly)} <span class="small muted" style="font-weight:500">a month</span>`, `<span class="small">${esc(cfg().instalmentCopy)} ${m$(v.monthlyTotal)} in total.</span>`, false, "");
  let body = "";
  if (c.step===1) body = `<h1 style="font-size:clamp(26px,3vw,34px)">Choose your plan</h1>
<div class="grid g2"><label class="f">Where are you paying from?<select id="co-country">${countryOptions(ct.code)}</select></label><label class="f">Show prices in${curSelect()}</label></div>${chargeNote}
<div class="stack" style="gap:14px" role="radiogroup" aria-label="Plan">${plans}</div>
${DEP()?`<p class="small muted row" style="gap:8px">${svg("shield","ico-inline")} Your deposit counts toward your fee and is fully refundable for 7 days.</p>`:""}
<button class="btn block" type="button" data-act="co-step" data-v="2">Continue</button>`;
  if (c.step===2) body = `<h1 style="font-size:clamp(26px,3vw,34px)">Your details</h1><p class="muted" style="margin-top:-12px">We use these for your receipt, your certificate and your cohort's WhatsApp group.</p>
<form data-form="co-details" class="stack" style="gap:16px" novalidate><div class="grid g2">
<label class="f">Full name<input name="name" autocomplete="name" value="${esc(c.name)}" placeholder="As it should appear on your certificate"></label>
<label class="f">Email address<input type="email" name="email" autocomplete="email" value="${esc(c.email)}" placeholder="you@example.com"></label>
<label class="f">WhatsApp number${tel(ct.dial, c.phone)}</label>
<label class="f">Which best describes you?${personaSelect(c.persona)}</label>
<label class="f">How did you hear about us?<select name="source"><option value="">Select one</option>${[["blog","Our blog"],["landing","Our website"],["partner","A partner organisation"],["email","Email from us"],["whatsapp","WhatsApp"],["friend","A friend or graduate"],["event","The free class"],["other","Somewhere else"]].map(o=>`<option value="${o[0]}"${o[0]===c.source?" selected":""}>${o[1]}</option>`).join("")}</select></label>
<label class="f">Referral code (optional)<input name="ref" value="${esc(c.ref)}" placeholder="For example RUTH-FH9W" data-refcheck><small class="ref-note" aria-live="polite"></small></label></div>
<label class="check" style="cursor:pointer"><input type="checkbox" name="agree" ${c.agree?"checked":""} style="width:20px;height:20px;margin-top:3px;flex:none"><span class="small">I accept the <a href="/terms" target="_blank">terms of enrollment</a> and <a href="/payment-policy" target="_blank">payment policy</a>, and I'm happy to receive class updates on WhatsApp and email.</span></label>
<div class="row"><button class="btn ghost" type="button" data-act="co-step" data-v="1">Back</button><button class="btn" type="submit" style="flex:1">Continue to payment</button></div></form>`;
  if (c.step===3) body = `<h1 style="font-size:clamp(26px,3vw,34px)">How would you like to pay?</h1><p class="muted" style="margin-top:-12px">Options for ${esc(ct.name)}. <button type="button" class="linkish" data-act="co-step" data-v="1">Change country or currency</button></p>
<div class="stack" style="gap:12px" role="radiogroup" aria-label="Payment method">${localMethods.map(m=>`<button type="button" role="radio" aria-checked="${m[0]===method}" class="choice ${m[0]===method?"on":""}" data-act="co-method" data-v="${m[0]}"><span class="radio"></span><span class="stack" style="gap:2px;flex:1"><b style="color:var(--ink)">${m[1]}</b><span class="small muted">${m[2]}</span></span></button>`).join("")}</div>
${chargeNote}
<div class="row"><button class="btn ghost" type="button" data-act="co-step" data-v="2">Back</button><button class="btn green" type="button" data-act="co-pay" style="flex:1">${I.lock("#06301A")} Pay ${money(todayCharged, charged)}</button></div>
<p class="small muted">Payments are processed securely by our licensed payment partner, Flutterwave. We never see or store your card details or wallet PIN.</p>`;
  const sched = plan === "deposit_early" ? [["Today (deposit)", v.deposit], [`By ${BAL_DATE()}`, v.earlyBal]] : plan === "monthly" ? [[`Today (due by ${startShort()})`, v.monthly], ["1 December", v.monthly], ["1 January", v.monthly]] : null;
  document.getElementById("co").innerHTML = `<a href="/courses/digital-marketing" style="font-weight:600;text-decoration:none">Back to the bootcamp</a>${steps}<div class="mobile-due"><span class="small">${esc(planName(plan))}, due today</span><b style="font-size:20px;color:var(--ink)">${m$(today)}</b></div>${body}`;
  document.getElementById("co-sum").innerHTML = `<h2 style="font-size:18px">Order summary</h2><div><b style="color:var(--ink)">${esc(cfg().courseTitle)}</b><div class="small muted">${esc(cfg().cohortName)} cohort, classes start ${esc(COHORT_START())}</div></div>
<div class="sumrow" style="border-top:1px solid var(--line);padding-top:12px"><span>Plan</span><b style="color:var(--ink)">${esc(planName(plan))}</b></div>
${sched ? sched.map(r=>`<div class="sumrow"><span>${esc(r[0])}</span><span>${m$(r[1])}</span></div>`).join("") : ""}
<div class="sumrow" style="border-top:1px solid var(--line);padding-top:12px;align-items:baseline"><b>Due today</b><b style="font-size:26px;color:var(--ink)">${m$(today)}</b></div>
${charged !== shown ? `<span class="small muted">Charged as ${money(todayCharged, charged)}</span>` : ""}
<ul class="list small" style="border-top:1px solid var(--line);padding-top:12px">${check("8 modules and 8 portfolio pieces")}${check("5 industry certifications")}${check("Live classes Thursday to Sunday")}${check("Capstone hackathon")}</ul>
<p class="small muted row" style="gap:8px">${I.lock()} Secure, encrypted checkout</p>`;
}
const moneyOf = (o) => o && o.cur && o.cur !== "NGN" && o.charge ? money(o.charge, o.cur) : naira(o.amount || 0);
P.checkoutDone = () => { const o = sget("npa-last-order"); if (!o) return P.notFound();
  const dep = o.plan === "deposit_early" || o.plan === "deposit_monthly";
  return { title:"Payment confirmed | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:760px"><div class="stack" style="gap:20px">
<div class="ok-icon">${I.check("#0F7A3C",34)}</div><h1 style="font-size:clamp(30px,4vw,44px)">${dep?"Your seat is reserved":"You're in"}, ${esc(o.first)}.</h1>
<p class="lead">${dep?"Your deposit has been received and your seat in the next cohort is held for you.":"Your seat in the next cohort is confirmed."} Your receipt and welcome email are on their way to ${esc(o.email)}. Order reference <b>${esc(o.ref)}</b>.</p>
<div class="card stack" style="gap:10px"><h2 style="font-size:18px">Payment details</h2><div class="sumrow"><span>Plan</span><b>${esc(planName(o.plan))}</b></div><div class="sumrow"><span>Paid today</span><b>${moneyOf(o)}</b></div><div class="sumrow"><span>Method</span><b>${esc(o.methodLabel || "")}</b></div>
${scheduleRows(o.plan).slice(1).map(r=>`<div class="sumrow"><span>${r[0]}</span><span>${esc(r[1])}</span></div>`).join("")}
${scheduleRows(o.plan).length>1?`<p class="small muted">We'll email a payment link before each due date. You can also pay any time from your <a href="/student">student area</a>.</p>`:""}</div>
<h2 style="font-size:20px">Your next three steps</h2>
<div class="stack" style="gap:12px">
<a class="btn green" style="justify-content:flex-start" href="${cfg().whatsappLink || wa("Hello, I've just enrolled (order " + o.ref + "). Please add me to my cohort's WhatsApp group.")}" target="_blank" rel="noopener">${I.wa()} 1. Join your cohort's WhatsApp group</a>
<a class="btn deep" style="justify-content:flex-start" href="/onboarding">2. Complete your onboarding checklist</a>
<a class="btn ghost" style="justify-content:flex-start" href="/curriculum">3. Look through the curriculum</a></div>
</div></div></section>`};};

/* ---------- Instalments and balances ---------- */
function instalmentOptions(){
  const v = PV(chargeCode()), m$ = n => money(n, chargeCode());
  const o = [];
  if (DEP()) {
    o.push(["Balance:early", `Early-bird balance (${m$(v.earlyBal)}), due ${BAL_DATE()}`]);
  }
  o.push(["December", `December instalment (${m$(v.monthly)}), due 1 Dec`], ["January", `January instalment (${m$(v.monthly)}), due 1 Jan`]);
  return o;
}
P.instalment = (q) => { const o = lastOf("orders") || {}; const pre = q.item === "Balance" ? (o.plan === "deposit_monthly" ? "Balance:monthly" : "Balance:early") : q.item;
  return { title:"Pay an instalment | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap co">
<form class="stack" data-form="instalment" style="gap:18px" novalidate><h1 style="font-size:clamp(28px,3.5vw,40px)">Pay your balance or an instalment</h1><p class="lead">Use the email you enrolled with. We check your plan and charge the right amount.</p>
<div class="grid g2"><label class="f">Full name<input name="name" autocomplete="name" value="${esc(o.name||"")}"></label><label class="f">Email you enrolled with<input type="email" name="email" autocomplete="email" value="${esc(o.email||"")}"></label>
<label class="f">Country<select name="country" data-dial-target="in-dial">${countryOptions(o.country||"NG")}</select></label>
<label class="f">WhatsApp number<span class="tel"><span id="in-dial" aria-hidden="true">${country(o.country||"NG").dial}</span><input type="tel" name="phone" autocomplete="tel-national" inputmode="tel" value="${esc(o.phone||"")}"></span></label>
<label class="f" style="grid-column:1/-1">Which payment?<select name="item">${instalmentOptions().map(x=>`<option value="${x[0]}"${x[0]===pre?" selected":""}>${esc(x[1])}</option>`).join("")}</select></label>
<label class="f">Show prices in${curSelect()}</label></div>

<button class="btn green" type="submit">${I.lock("#06301A")} Continue to secure payment</button>
<p class="small muted">Paid in full already? You have nothing more to pay. Questions: <a href="/contact?topic=payment">contact us</a>.</p></form>
<aside class="summary"><h2 style="font-size:18px">Payment dates</h2>${DEP()?`<div class="sumrow"><span>Balance</span><b>${esc(BAL_DATE())}</b></div>`:""}<div class="sumrow"><span>December</span><b>1 December</b></div><div class="sumrow"><span>January</span><b>1 January</b></div><p class="small muted">See all your payments in your <a href="/student">student area</a>. Read the <a href="/payment-policy">payment policy</a>.</p></aside>
</div></section>`};};
P.instalmentDone = () => { const p = sget("npa-last-instalment"); if (!p) return P.notFound();
  return { title:"Payment received | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:720px"><div class="stack" style="gap:18px"><div class="ok-icon">${I.check("#0F7A3C",34)}</div><h1 style="font-size:clamp(30px,4vw,44px)">Thank you, ${esc(p.first)}.</h1><p class="lead">Your ${p.month === "Balance" ? "balance" : esc(p.month) + " instalment"} of ${moneyOf(p)} has been received. A receipt is on its way to ${esc(p.email)}. Reference <b>${esc(p.ref)}</b>.</p><div class="row"><a class="btn deep" href="/student">Open my student area</a><a class="btn ghost" href="/curriculum">View the curriculum</a></div></div></div></section>`};};

/* ---------- Blog ---------- */
/* ---------- Blog (live from WordPress via getBlogData) ---------- */
let BLOG = null;
export function primeBlog(d){ BLOG = d || null; }
const FALLBACK_IMG = "/og-image.jpg";
function bImg(p, cls, eager){ return `<img class="${cls}" src="${esc(p.image || FALLBACK_IMG)}" alt="${esc(p.imageAlt || "")}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">`; }
function bMeta(p){ return `<span class="small muted">${esc(p.date)} · ${esc(p.author)}</span>`; }
function bCard(p){ return `<article class="card blog-card"><a class="blog-media" href="/blog/${esc(p.slug)}" tabindex="-1" aria-hidden="true">${bImg(p,"")}</a><div class="stack" style="gap:10px;padding:18px 20px 22px;flex:1">${p.category?`<span class="pill" style="align-self:flex-start">${esc(p.category)}</span>`:""}<h3><a href="/blog/${esc(p.slug)}" style="color:var(--ink);text-decoration:none">${esc(p.title)}</a></h3><p class="muted small">${esc(p.excerpt)}</p>${bMeta(p)}<a href="/blog/${esc(p.slug)}" style="font-weight:600;margin-top:auto">Read article</a></div></article>`; }
function bSkeleton(n){ return `<div class="grid g3" aria-busy="true" aria-label="Loading articles">${Array.from({length:n}).map(()=>`<div class="card blog-card"><div class="skel" style="aspect-ratio:16/9"></div><div class="stack" style="gap:10px;padding:18px 20px 22px"><div class="skel" style="height:22px;width:80%"></div><div class="skel" style="height:14px"></div><div class="skel" style="height:14px;width:60%"></div></div></div>`).join("")}</div>`; }
function bError(msg, href){ return `<div class="card stack" role="alert" style="gap:12px;text-align:center;align-items:center;padding:36px"><h2 style="font-size:22px;margin:0">${esc(msg || "We couldn't load the blog right now.")}</h2><p class="muted">Please check your connection and try again.</p><a class="btn" href="${esc(href)}" data-reload>Try again</a></div>`; }
function postCards(){
  const posts = BLOG && BLOG.kind === "home" ? BLOG.latest : null;
  if (!posts) return bSkeleton(3);
  if (!posts.length) return `<p class="muted">New articles are on the way. Check back soon.</p>`;
  return `<div class="grid g3">${posts.map(bCard).join("")}</div>`;
}
function blogUrl(o){ const q = new URLSearchParams(); if (o.search) q.set("search", o.search); if (o.cat) q.set("cat", o.cat); if (o.page && o.page > 1) q.set("page", o.page); const s = q.toString(); return "/blog" + (s ? "?" + s : ""); }
P.blog = (q) => {
  const d = BLOG && BLOG.kind === "list" ? BLOG : null;
  const search = d ? d.search : (q.search || ""), cat = d ? d.cat : (Number(q.cat) || null);
  const chips = d && d.cats.length ? `<nav class="blog-chips" aria-label="Categories"><a href="${blogUrl({search})}"${!cat?' aria-current="true"':""}>All</a>${d.cats.map(c=>`<a href="${blogUrl({search,cat:c.id})}"${cat===c.id?' aria-current="true"':""}>${esc(c.name)}</a>`).join("")}</nav>` : "";
  const form = `<form class="blog-search" data-form="blog-search" role="search"><label class="sr-only" for="blog-q">Search articles</label><input id="blog-q" name="search" type="search" placeholder="Search articles" value="${esc(search)}" maxlength="100">${cat?`<input type="hidden" name="cat" value="${cat}">`:""}<button class="btn" type="submit">Search</button></form>`;
  let body;
  if (BLOG && BLOG.kind === "error") body = bError(BLOG.error, blogUrl({search, cat, page:Number(q.page)||1}));
  else if (!d) body = bSkeleton(6);
  else if (!d.list.posts.length) body = `<div class="card stack" style="gap:12px;text-align:center;align-items:center;padding:36px"><h2 style="font-size:22px;margin:0">No articles found</h2><p class="muted">${search?`Nothing matched “${esc(search)}”. Try another word.`:"There are no articles here yet."}</p><a class="btn ghost" href="/blog">See all articles</a></div>`;
  else {
    const posts = d.list.posts.slice(); const page = d.list.page, total = d.list.totalPages;
    const feat = page === 1 && !search && !cat ? posts.shift() : null;
    const featured = feat ? `<article class="card blog-feature"><a class="blog-media" href="/blog/${esc(feat.slug)}" tabindex="-1" aria-hidden="true">${bImg(feat,"",true)}</a><div class="stack" style="gap:14px;padding:28px"><span class="eyebrow">Latest article${feat.category?" · "+esc(feat.category):""}</span><h2 style="font-size:clamp(24px,3vw,34px);margin:0"><a href="/blog/${esc(feat.slug)}" style="color:var(--ink);text-decoration:none">${esc(feat.title)}</a></h2><p class="muted">${esc(feat.excerpt)}</p>${bMeta(feat)}<a class="btn" style="align-self:flex-start" href="/blog/${esc(feat.slug)}">Read article</a></div></article>` : "";
    const pager = total > 1 ? `<nav class="blog-pager" aria-label="Pages">${page>1?`<a class="btn ghost" href="${blogUrl({search,cat,page:page-1})}">Newer</a>`:"<span></span>"}<span class="small muted">Page ${page} of ${total}</span>${page<total?`<a class="btn ghost" href="${blogUrl({search,cat,page:page+1})}">Older</a>`:"<span></span>"}</nav>` : "";
    body = featured + (posts.length ? `<div class="grid g3">${posts.map(bCard).join("")}</div>` : "") + pager;
  }
  return { title:"Blog | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap stack" style="gap:14px"><h1>Blog</h1><p class="lead">Plain-English guides to digital marketing, careers and growth, written for African marketers.</p>${form}</div></section><section class="section"><div class="wrap stack" style="gap:32px">${chips}${search?`<p class="muted">Results for “${esc(search)}”</p>`:""}${body}${eventBand()}</div></section>`};
};
P.post = (q, slug) => {
  const d = BLOG && BLOG.kind === "post" && BLOG.slug === decodeURIComponent(slug) ? BLOG : null;
  if (BLOG && BLOG.kind === "error") return { title:"Blog | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:760px">${bError(BLOG.error, "/blog/" + slug)}<p style="margin-top:16px"><a href="/blog">Back to blog</a></p></div></section>` };
  if (d && !d.post) return P.notFound();
  const open = earlyOpen();
  const aside = `<aside class="summary"><span class="pill green" style="align-self:flex-start">Next cohort enrolling</span><h2 style="font-size:20px">Learn it properly in 8 modules</h2><p class="small">Five certifications, live classes and a portfolio. ${DEP()?`Reserve your seat for ${P$("deposit")}${open?`. ${P$("early")} in total until ${esc(EARLY_DATE())}`:""}.`:open?`${naira(PRICE_EARLY())} paid once until ${esc(EARLY_DATE())}, or ${naira(PRICE_MONTH())} a month.`:`From ${naira(PRICE_MONTH())} a month for ${cfg().instalmentCount} months.`}</p><a class="btn deep block" href="/courses/digital-marketing">See the bootcamp</a><a class="btn ghost block" href="/events/first-marketing-strategy" data-ga-free-event>Join the free class</a></aside>`;
  if (!d) return { title:"Blog | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:760px" aria-busy="true"><div class="stack" style="gap:16px"><div class="skel" style="height:40px;width:85%"></div><div class="skel" style="aspect-ratio:16/9"></div><div class="skel" style="height:14px"></div><div class="skel" style="height:14px;width:70%"></div></div></div></section>` };
  const p = d.post;
  const related = d.related.length ? `<section class="stack" style="gap:18px;margin-top:40px"><h2 style="font-size:24px;margin:0">Related articles</h2><div class="grid g3">${d.related.map(bCard).join("")}</div></section>` : "";
  return { title:p.title + " | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap"><div class="grid" style="grid-template-columns:minmax(0,1fr) 300px;gap:48px;align-items:start" id="post">
<article class="article stack" style="gap:18px"><a href="/blog" style="font-weight:600;text-decoration:none">← Back to blog</a>${p.category?`<span class="pill" style="align-self:flex-start">${esc(p.category)}</span>`:""}<h1 style="font-size:clamp(30px,4vw,44px)">${esc(p.title)}</h1>${bMeta(p)}${p.image?`<figure class="blog-hero">${bImg(p,"",true)}</figure>`:""}<div class="wp-content">${p.content}</div>
<div class="card stack" style="gap:10px;margin-top:16px"><h2 style="font-size:22px;margin:0">Learn it properly, with feedback</h2><p>Our Professional Digital Marketing Bootcamp covers strategy, content, social, SEO, paid media, email and analytics in eight practical modules.</p><div class="row"><a class="btn" href="/courses/digital-marketing">See the bootcamp</a><a class="btn ghost" href="/curriculum">View the curriculum</a></div></div></article>
${aside}</div>${related}</div><style>@media (max-width:900px){#post{grid-template-columns:1fr!important}}</style></section>`};
};

/* ---------- FAQ, contact, waitlist ---------- */
P.faq = () => ({ title:"FAQ | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap stack" style="gap:14px"><h1>Frequently asked questions</h1><p class="lead">About the bootcamp, paying from anywhere in Africa, and the free event.</p></div></section>
<section class="section"><div class="wrap stack" style="gap:40px;max-width:900px">${FAQS().map(g=>`<div class="stack" style="gap:12px"><h2 style="font-size:26px">${g[0]}</h2>${faqBlock(g[1],false)}</div>`).join("")}
<div class="band"><div class="stack" style="gap:6px"><h2 style="font-size:24px">Still have a question?</h2><p>Talk to an advisor on WhatsApp and get an answer the same day.</p></div><div class="stack" style="gap:10px"><a class="btn green" href="${wa("Hello, I have a question about Nerdy Pixels Academy.")}" target="_blank" rel="noopener">${I.wa()} Chat on WhatsApp</a><a class="btn ghost" href="/contact">Send us a message</a></div></div></div></section>`});
P.contact = (q) => ({ title:"Contact us | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap stack" style="gap:14px"><h1>Contact us</h1><p class="lead">Questions about courses, payments or your enrollment? We usually reply the same working day.</p></div></section>
<section class="section"><div class="wrap co">
<form class="stack" data-form="contact" style="gap:16px" novalidate><div class="grid g2"><label class="f">Full name<input name="name" autocomplete="name"></label><label class="f">Email address<input type="email" name="email" autocomplete="email"></label>
<label class="f">Country<select name="country" data-dial-target="ct-dial">${countryOptions("NG")}</select></label><label class="f">WhatsApp number (optional)<span class="tel"><span id="ct-dial" aria-hidden="true">+234</span><input type="tel" name="phone" autocomplete="tel-national" inputmode="tel"></span></label></div>
<label class="f">What is it about?<select name="topic">${[["bootcamp","The Digital Marketing Bootcamp"],["payment","Payments or instalments"],["profile","My student profile"],["event","The free event"],["partnership","Partnerships"],["other","Something else"]].map(o=>`<option value="${o[0]}"${q.topic===o[0]?" selected":""}>${o[1]}</option>`).join("")}</select></label>
<label class="f">Message<textarea name="message" placeholder="How can we help?"></textarea></label>
<button class="btn" type="submit">Send message</button></form>
<aside class="summary"><h2 style="font-size:18px">Other ways to reach us</h2><a class="btn green block" href="${wa("Hello Nerdy Pixels Academy.")}" target="_blank" rel="noopener">${I.wa()} WhatsApp us</a><div class="sumrow"><span>Email</span><a href="mailto:${SITE.email}">${SITE.email}</a></div><div class="sumrow"><span>Phone</span><a href="tel:+${SITE.phone}">${SITE.phoneLabel}</a></div><p class="small muted">Partnership enquiries are welcome from schools, communities and employers across Africa.</p></aside>
</div></section>`});
P.contactDone = () => { const m = lastOf("messages"); return { title:"Message sent | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:720px"><div class="stack" style="gap:18px"><div class="ok-icon">${I.check("#0F7A3C",34)}</div><h1 style="font-size:clamp(30px,4vw,44px)">Thanks${m?", "+esc(m.first):""}. We've got your message.</h1><p class="lead">We'll reply to ${m?esc(m.email):"you"} within one working day. For anything urgent, message us on WhatsApp.</p><div class="row"><a class="btn green" href="${wa("Hello, I just sent a message through your website.")}" target="_blank" rel="noopener">${I.wa()} WhatsApp us</a><a class="btn ghost" href="/">Back to home</a></div></div></div></section>`};};
P.waitlist = (q, slug) => { const c = COURSES.find(x=>x.slug===slug); if (!c) return P.notFound();
  return { title:c.name + " waitlist | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap hero-grid" style="align-items:start"><div class="stack" style="gap:18px"><span class="pill" style="align-self:flex-start">${c.weeks}</span><h1>${c.name}</h1><p class="lead">${c.text}</p><p>Dates and pricing for the next intake are not announced yet. Join the waitlist and we'll tell you first, before enrollment opens to everyone.</p><p class="muted">Want to start now? The <a href="/courses/digital-marketing">Professional Digital Marketing Bootcamp</a> covers the foundations of every specialist programme.</p></div>
<form class="price-card" data-form="waitlist" data-course="${c.slug}" novalidate><h2 style="font-size:22px">Join the waitlist</h2><label class="f">Full name<input name="name" autocomplete="name"></label><label class="f">Email address<input type="email" name="email" autocomplete="email"></label><label class="f">Country<select name="country">${countryOptions("NG")}</select></label><button class="btn block" type="submit">Join the waitlist</button><p class="small muted">No spam. One email when enrollment opens.</p></form></div></section>`};};
P.waitlistDone = (q, slug) => { const c = COURSES.find(x=>x.slug===slug) || {name:"the programme"};
  return { title:"You're on the waitlist | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:720px"><div class="stack" style="gap:18px"><div class="ok-icon">${I.check("#0F7A3C",34)}</div><h1 style="font-size:clamp(30px,4vw,44px)">You're on the ${esc(c.name)} waitlist.</h1><p class="lead">We'll email you as soon as dates and pricing are confirmed. In the meantime, the free event is a good place to start.</p><div class="row"><a class="btn" href="/events/first-marketing-strategy" data-ga-free-event>Join the free event</a><a class="btn ghost" href="/courses">Back to courses</a></div></div></div></section>`};};

/* ---------- Policies ---------- */
const legal = (title, updated, sections) => ({ title:title + " | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap article stack" style="gap:18px"><h1 style="font-size:clamp(30px,4vw,44px)">${title}</h1><p class="muted">Last updated ${updated}</p>${sections.map(s=>`<h2>${s[0]}</h2>${s[1].map(p=>`<p>${p}</p>`).join("")}`).join("")}<p>Questions? Email <a href="mailto:${SITE.email}">${SITE.email}</a> or <a href="/contact">contact us</a>.</p></div></section>`});
P.terms = () => legal("Terms of enrolment","September 2026",[
 ["About these terms",["These terms apply when you enroll in the Professional Digital Marketing Bootcamp run by Nerdy Pixels Academy, a brand of Nerdy Pixels Digital. By completing checkout, you agree to them."]],
 ["Your place in the cohort",["Your seat is confirmed once your first payment is received. Seats are personal and cannot be transferred to someone else without our written agreement."]],
 ["Classes and attendance",["Live classes take place online from Thursday to Sunday, with self-paced work from Monday to Wednesday. Session times are confirmed at orientation. We may occasionally move a session, and we will give you notice when we do."]],
 ["Certifications",["The bootcamp prepares you for five industry certifications and includes our certificate of completion. Third-party certifications are issued by their providers under their own rules, and passing them depends on your own assessment results."]],
 ["Your work",["Portfolio work you create in the bootcamp belongs to you. Course materials, recordings and templates are for your personal learning and may not be shared or resold."]],
 ["Conduct",["We expect respectful behaviour in classes and community groups. We may remove anyone who harasses others, shares course materials publicly or disrupts learning."]],
 ["Changes",["If we need to change these terms, we will tell enrolled students by email before the change takes effect."]]
]);
P.payment = () => { const d = cfg().depositAmount, e = PRICE_EARLY(), m = PRICE_MONTH(), n = cfg().instalmentCount; return legal("Payment policy","October 2026",[
 ["Prices", DEP()
   ? [`Seat deposit: ${naira(d)}, paid when you enroll. It counts toward your fee.`,
      `${cfg().offerLabel}: ${naira(e)} in total (the deposit, then ${naira(e-d)} by ${BAL_DATE()}), available until ${EARLY_DATE()}${cfg().seatLimit?" or until early-bird seats run out":""}.`,
      `Monthly plan: ${naira(m)} a month for ${n} months, ${naira(m*n)} in total, with no deposit. The first ${naira(m)} is due by ${startShort()}, then ${naira(m)} on 1 December and 1 January.`]
   : [`Early bird: ${naira(e)}, paid once, available until ${EARLY_DATE()}.`, `Monthly plan: ${naira(m)} a month for ${n} months, ${naira(m*n)} in total.`]],
 ["Paying from outside Nigeria",["You can pay from anywhere in the world. Prices shown in other currencies are fixed by us, not live exchange rates. Where we can't charge your currency directly, you pay by Visa or Mastercard in US dollars, and the exact amount is shown before you confirm. Your bank may charge its own fees."]],
 ["Instalments and reminders",[`We email a payment link before each due date${DEP()?`, starting with the balance due ${BAL_DATE()}`:""}. December and January instalments are due on the 1st of the month.`,"If a payment is more than seven days late, we may pause your access to live classes until it is paid. Talk to us early if you are having difficulty paying."]],
 ["Refunds", DEP()
   ? [`Your deposit is fully refundable if you ask in writing within 7 days of paying, and no later than ${BAL_DATE()}. After that it is not refundable, but you can move it once to the following cohort.`,"Other payments are not refundable once classes start, but you may ask to move to a later cohort."]
   : ["If the bootcamp is not right for you, request a refund in writing within seven days of your first payment and before the end of the first week of classes. After that, payments are not refundable, but you may ask to move to a later cohort."]],
 ["Security",["Payments are processed by our licensed payment partner. We never see or store your full card details or wallet PIN."]]
]);};
P.privacy = () => legal("Privacy policy","September 2026",[
 ["What we collect",["When you register for an event, enroll, join a waitlist or contact us, we collect the details you give us: your name, email address, WhatsApp number, country and your answers to our short questions. When you pay, our payment partner processes your payment details."]],
 ["How we use it",["We use your details to run your enrollment, send class information, receipts and reminders, answer your questions and improve our courses. With your consent, we send you marketing tips and event invitations, and you can unsubscribe at any time."]],
 ["Who we share it with",["We share only what is needed with service providers who help us run the academy, such as our payment partner and email and messaging tools. We do not sell your personal data."]],
 ["How long we keep it",["We keep student records for as long as needed to issue certificates and meet legal and accounting requirements. You can ask us to delete marketing data at any time."]],
 ["Your rights",["You can ask to see, correct or delete the personal data we hold about you, in line with the Nigeria Data Protection Act 2023 and other applicable laws. Email us to make a request."]]
]);
P.notFound = () => ({ title:"Page not found | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap stack" style="gap:18px;max-width:720px"><h1>We couldn't find that page.</h1><p class="lead">The link may be out of date. These pages are a good place to start:</p><div class="row"><a class="btn" href="/courses/digital-marketing">Digital Marketing Bootcamp</a><a class="btn ghost" href="/">Home</a><a class="btn ghost" href="/contact">Contact us</a></div></div></section>`});
function toast(t){ const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role","status"); el.textContent = t; document.body.appendChild(el); setTimeout(()=>el.remove(), 3200); }

/* ============ Router ============ */
const ROUTES = [
 [/^\/$/, P.home], [/^\/courses$/, P.courses], [/^\/courses\/digital-marketing$/, P.bootcamp], [/^\/curriculum$/, P.curriculum],
 [/^\/onboarding$/, P.onboarding], [/^\/events\/first-marketing-strategy$/, P.event], [/^\/events\/first-marketing-strategy\/registered$/, P.eventDone],
 [/^\/checkout$/, P.checkout], [/^\/checkout\/success$/, P.checkoutDone], [/^\/pay-instalment$/, P.instalment], [/^\/pay-instalment\/success$/, P.instalmentDone],
 [/^\/blog$/, P.blog], [/^\/blog\/([^/]+)$/, P.post], [/^\/faq$/, P.faq], [/^\/contact$/, P.contact], [/^\/contact\/sent$/, P.contactDone],
 [/^\/waitlist\/([a-z0-9-]+)$/, P.waitlist], [/^\/waitlist\/([a-z0-9-]+)\/joined$/, P.waitlistDone],
 [/^\/terms$/, P.terms], [/^\/payment-policy$/, P.payment], [/^\/privacy$/, P.privacy]
];
let current = "";
function parseQS(qs){ const q = {}; (qs||"").replace(/^\?/,"").split("&").filter(Boolean).forEach(kv=>{ const [k,v] = kv.split("="); try{ q[decodeURIComponent(k)] = decodeURIComponent((v||"").replace(/\+/g," ")); }catch(e){} }); return q; }
function parse(){ return { path: location.pathname.replace(/\/+$/,"") || "/", q: parseQS(location.search) }; }
const CAMPAIGN_KEYS = ["utm_source","utm_medium","utm_campaign","utm_content"];
function keepCampaign(h){
  const u = new URL(h, location.origin), cur = new URLSearchParams(location.search);
  if (u.origin !== location.origin) return h;
  CAMPAIGN_KEYS.forEach(k => { if (!u.searchParams.has(k) && cur.has(k)) u.searchParams.set(k, cur.get(k)); });
  return u.pathname + u.search + u.hash;
}
function go(h){ h = keepCampaign(h); if (window.__npaNav) window.__npaNav(h); else location.href = h; }
/* Every page hero without its own photo gets the brand photo behind it. */
const withHeroPhoto = html => html.replace(/<section class="hero"([^>]*)>(?!<div class="hero-bg")/, (m, attrs) => `<section class="hero"${attrs}><div class="hero-bg" aria-hidden="true">${pic("/brand/photos/hero-neon-1920.webp", "", { eager:true, sizes:"100vw", w:1920, h:1280 })}</div>`);
function shell(path, page){ return header(path) + `<main id="main" tabindex="-1"${page.main?` class="${page.main}"`:""}>${withHeroPhoto(page.html)}</main>` + footer(path); }
function render(keepScroll){
  const { path, q } = parse();
  if (q.preview === "open" || q.preview === "closed" || q.preview === "auto"){ try{ q.preview==="auto" ? sessionStorage.removeItem("npa-preview") : sessionStorage.setItem("npa-preview", q.preview); }catch(e){} }
  if (path === current && q.s && !keepScroll){ scrollToId(q.s); return; }
  let page = null;
  for (const [re, fn] of ROUTES){ const m = path.match(re); if (m){ page = fn(q, m[1]); break; } }
  if (!page) page = P.notFound();
  current = path;
  document.title = page.title;
  const y = window.scrollY;
  document.getElementById("app").innerHTML = shell(path, page);
  if (page.mount) page.mount();
  applyCurrency(); enhance();
  if (window.__npaTick) window.__npaTick();
  if (/^\/(checkout|pay-instalment)/.test(path)){ const f = document.querySelector(".wa-float"); if (f) f.remove(); }
  if (keepScroll) { window.scrollTo(0, y); return; }
  const hash = location.hash.slice(1);
  if (q.s) setTimeout(()=>scrollToId(q.s), 30); else if (hash) setTimeout(()=>scrollToId(hash), 30); else window.scrollTo(0, 0);
  if (document.querySelector("main h1") && !q.s && !hash) document.getElementById("main").focus({preventScroll:true});
}
function scrollToId(id){ const el = document.getElementById(id); if (el) el.scrollIntoView({behavior:"smooth", block:"start"}); }

/* ============ Motion: reveal on scroll, count-up stats, sticky bar ============ */
const reduced = () => { try{ return matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){ return false; } };
let io = null, stickyIo = null, onPricing = false;
function countUp(el){
  const to = Number(el.dataset.count), suf = el.dataset.suffix || "", dec = String(to).includes(".") ? 1 : 0;
  if (!Number.isFinite(to) || reduced()) return;
  const t0 = performance.now(), dur = 1200;
  const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toLocaleString("en-US", { maximumFractionDigits: dec, minimumFractionDigits: dec }) + suf; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function enhance(){
  if (io) io.disconnect();
  const targets = document.querySelectorAll("main .section, main .stats-strip, main .final, main [data-reveal], main .stat b[data-count]");
  if (!("IntersectionObserver" in window) || reduced()) { targets.forEach(t => t.classList.add("in")); return; }
  io = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; const t = en.target; t.classList.add("in"); if (t.matches("b[data-count]")) countUp(t); io.unobserve(t); }), { threshold: .12, rootMargin: "0px 0px -8% 0px" });
  targets.forEach(t => io.observe(t));
  document.documentElement.classList.add("js-motion");
  // Sticky reserve bar: after the hero, hidden while pricing is on screen.
  if (stickyIo) stickyIo.disconnect();
  const pricing = document.getElementById("pricing"); onPricing = false;
  if (pricing) { stickyIo = new IntersectionObserver(([en]) => { onPricing = en.isIntersecting; stickyState(); }, { threshold: .1 }); stickyIo.observe(pricing); }
  stickyState();
}
function stickyState(){
  const s = document.getElementById("sticky"); if (!s) { document.body.classList.remove("has-sticky"); return; }
  const on = window.scrollY > 700 && !onPricing;
  s.classList.toggle("show", on); s.setAttribute("aria-hidden", String(!on)); const a = s.querySelector("a"); if (a) a.tabIndex = on ? 0 : -1;
  document.body.classList.toggle("has-sticky", on);
}

/* ============ Interactions ============ */
let booted = false;
function closeMenus(){ document.querySelectorAll(".dd.open").forEach(d => { d.classList.remove("open"); const b = d.querySelector(".dd-btn"); if (b) b.setAttribute("aria-expanded","false"); }); }
function setDrawer(open){ const d = document.getElementById("drawer"), b = document.querySelector(".burger"); if (!d || !b) return; d.hidden = !open; b.setAttribute("aria-expanded", String(open)); b.setAttribute("aria-label", open ? "Close menu" : "Open menu"); }
function openSyllabus(){ const m = document.getElementById("syllabus"); if (!m) return; m.hidden = false; document.body.style.overflow = "hidden"; setTimeout(() => { const i = m.querySelector("input[name=first]"); if (i) i.focus(); }, 40); track("syllabus_open", {}); }
function closeSyllabus(){ const m = document.getElementById("syllabus"); if (!m || m.hidden) return; m.hidden = true; document.body.style.overflow = ""; }
const track = (name, params) => { try{ if (typeof window.gtag === "function") window.gtag("event", name, { ...params, currency: CUR_CODE }); }catch(e){} };
export function boot(){
if (booted) return; booted = true;
// Remember a referral link (?ref=CODE) so checkout can prefill the code.
try{ const rc = new URLSearchParams(location.search).get("ref"); if (rc) localStorage.setItem("npa-ref", rc.trim().toUpperCase()); }catch(e){}
const [code, how] = detectCurrency(); setCurrency(code, how);
const pad = n => String(n).padStart(2, "0");
const tick = () => {
  document.querySelectorAll("[data-countdown]").forEach(el => { const ms = new Date(el.dataset.countdown) - Date.now(); if (ms <= 0){ el.textContent = ""; return; } const d = Math.floor(ms/864e5), h = Math.floor(ms%864e5/36e5), m = Math.floor(ms%36e5/6e4); el.textContent = `${d}d ${h}h ${m}m ${el.dataset.label}`; });
  document.querySelectorAll("[data-clock]").forEach(el => { const ms = Math.max(0, new Date(el.dataset.clock) - Date.now()); const set = (u, v) => { const b = el.querySelector(`[data-u="${u}"]`); if (b) b.textContent = pad(v); }; set("d", Math.floor(ms/864e5)); set("h", Math.floor(ms/36e5)%24); set("m", Math.floor(ms/6e4)%60); });
};
tick(); setInterval(tick, 30000); window.__npaTick = tick;
addEventListener("scroll", stickyState, { passive: true });
// Live preview from the admin content builder (same origin only).
window.addEventListener("message", e => {
  if (e.origin !== location.origin || !e.data || e.data.type !== "npa-cms-preview") return;
  CMS_DRAFT = e.data.content || null; render(true);
});
if (window.parent !== window) { try{ window.parent.postMessage({ type: "npa-cms-ready" }, location.origin); }catch(e){} }
document.addEventListener("click", e => {
  const enroll = e.target.closest("[data-ga-enrol]");
  if (enroll) { track("enrol_click", { button_location: enroll.dataset.gaEnrol }); const h = enroll.getAttribute("href") || ""; if (h.includes("/checkout")) track("begin_checkout", { plan: (h.match(/plan=([\w-]+)/)||[])[1] || "", value: PV().deposit || PV().early }); }
  if (e.target.closest("[data-ga-free-event]")) track("free_event_click");
  if (e.target.closest("[data-ga-whatsapp]")) track("whatsapp_click");
  if (e.target.closest("[data-open=syllabus]")) { e.preventDefault(); openSyllabus(); return; }
  if (e.target.closest("[data-close-syllabus]") || e.target.id === "syllabus") { closeSyllabus(); return; }
  const v = e.target.closest("[data-video]"); if (v) { e.preventDefault(); openVideo(v.dataset.video); track("video_start", { video: v.dataset.video }); return; }
  if (e.target.closest("[data-close-video]") || e.target.id === "vmodal") { closeVideo(); return; }
  if (!e.target.closest(".dd")) closeMenus();
  if (e.target.closest("#drawer a")) setDrawer(false);
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, val = a.dataset.v;
  if (act === "menu"){ const d = document.getElementById("drawer"); setDrawer(d.hidden); return; }
  if (act === "dd"){ const dd = a.closest(".dd"); const open = !dd.classList.contains("open"); closeMenus(); dd.classList.toggle("open", open); a.setAttribute("aria-expanded", String(open)); return; }
  const c = coState();
  if (act === "co-plan"){ if ((val === "early" || val === "deposit_early") && !earlyOpen()) return; c.plan = val; coSave(c); coRender(); track("select_plan", { plan: val }); }
  if (act === "co-step"){ c.step = Number(val); coSave(c); coRender(); window.scrollTo({top:0,behavior:"smooth"}); }
  if (act === "co-method"){ c.method = val; coSave(c); coRender(); }
  if (act === "co-pay"){
    const ct = country(c.country), plan = coPlan(c), charged = chargeCode();
    const methods = charged === "NGN" && ct.code === "NG" ? ct.methods : charged === ct.cur ? ct.methods : [["card","Card",""]];
    const m = methods.find(x=>x[0]===c.method) || methods[0];
    const btn = a; btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = "Opening secure payment…";
    const order = { plan, amount: dueToday(plan, "NGN"), charge: dueToday(plan, charged), cur: charged, country: ct.code, methodLabel: m[1], method: m[0], name: c.name, first: c.name.trim().split(" ")[0], email: c.email.trim(), phone: c.phone, persona: c.persona, source: c.source, referral: c.ref };
    save("orders", order);
    window.__npaPay({ kind:"enrolment", plan, currency: charged, name:c.name, email:c.email.trim(), phone:(ct.dial||"")+" "+(c.phone||""), country:ct.code, persona:c.persona, source:c.source, referral:c.ref, method:m[0] })
      .then(r => { sset("npa-pending-order", order); track("add_payment_info", { plan, value: r.charge }); location.href = r.link; })
      .catch(err => { btn.disabled = false; btn.innerHTML = old; toast((err && err.message) || "We couldn't start the payment. Please try again."); });
  }
});
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; closeMenus(); closeSyllabus(); closeVideo(); setDrawer(false); });
document.addEventListener("change", e => {
  const t = e.target;
  if (t.classList && t.classList.contains("cur-sel")){ setCurrency(t.value, "manual"); try{ localStorage.setItem("npa_currency", t.value); }catch(err){} track("currency_change", { new_currency: t.value });
    if (document.getElementById("co")) coRender(); else if (document.querySelector('form[data-form="instalment"]')) render(true); else applyCurrency(); applyCurrency(); return; }
  if (t.id === "co-country"){ const c = coState(); c.country = t.value; c.method = null; coSave(c); if (CUR_HOW !== "manual") setCurrency(t.value === "XX" ? autoCurrency("US") : autoCurrency(t.value), "auto"); coRender(); applyCurrency(); }
  if (t.dataset && t.dataset.dialTarget){ const el = document.getElementById(t.dataset.dialTarget); if (el) el.textContent = country(t.value).dial; }
});
document.addEventListener("toggle", e => { const d = e.target; if (d.tagName === "DETAILS" && d.open) track("faq_open", { question: (d.querySelector("summary")||{}).textContent?.trim().slice(0, 60) }); }, true);
document.addEventListener("input", e => {
  const f = e.target.closest('form[data-form="co-details"]'); if (!f) return;
  const c = coState(); const t = e.target; c[t.name] = t.type === "checkbox" ? t.checked : t.value; coSave(c);
});
// Live referral code check at checkout.
let refTimer = null;
document.addEventListener("input", e => {
  const t = e.target.closest("[data-refcheck]"); if (!t) return;
  const note = t.parentElement.querySelector(".ref-note"); if (!note) return;
  clearTimeout(refTimer);
  const code = t.value.trim().toUpperCase();
  if (!code){ note.textContent = ""; note.className = "ref-note"; return; }
  if (!window.__npaRefCheck) return;
  refTimer = setTimeout(() => {
    window.__npaRefCheck({ code }).then(r => {
      if (t.value.trim().toUpperCase() !== code) return;
      if (r && r.ok){ note.textContent = `Code applied — referred by ${r.name}.`; note.className = "ref-note ok"; }
      else { note.textContent = "Code not recognised."; note.className = "ref-note bad"; }
    }).catch(() => {});
  }, 400);
});
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form]"); if (!f) return; e.preventDefault();
  const d = Object.fromEntries(new FormData(f).entries()); const kind = f.dataset.form;
  const need = (cond, msg) => { if (!cond){ formError(f, msg); throw 0; } };
  const busy = (label) => { const b = f.querySelector('button[type="submit"]'); if (b){ b.dataset.label = b.dataset.label || b.textContent; b.disabled = !!label; b.textContent = label || b.dataset.label; } };
  try{
    if (kind === "blog-search"){ const u = new URLSearchParams(); if ((d.search||"").trim()) u.set("search", d.search.trim()); if (d.cat) u.set("cat", d.cat); go("/blog" + (u.toString() ? "?" + u : "")); return; }
    if (kind === "syllabus"){
      need((d.first||"").trim(), "Enter your first name."); need(validEmail(d.email), "Enter a valid email address, for example ada@gmail.com.");
      formError(f, ""); busy("Sending…");
      const done = () => { f.querySelector(".sy-fields").hidden = true; f.querySelector(".ok").hidden = false; track("generate_lead", { lead_type: "syllabus" }); };
      if (!window.__npaSyllabus) { done(); return; }
      window.__npaSyllabus({ firstName: d.first, email: d.email, phone: d.phone || "", website: d.website || "" }).then(done).catch(err => { busy(""); formError(f, (err && err.message) || "We couldn't send the syllabus. Please try again."); });
      return;
    }
    if (kind === "freeclass"){
      need((d.name||"").trim(), "Enter your full name."); need(digits(d.phone).length >= 7, "Enter your WhatsApp number with your country code."); need(validEmail(d.email), "Enter a valid email address, for example ada@gmail.com."); need(d.persona, "Tell us which best describes you.");
      formError(f, ""); busy("Saving your seat…");
      const first = d.name.trim().split(" ")[0];
      const done = () => { save("events", { ...d, first }); f.querySelectorAll("label, button, .fine").forEach(n => n.hidden = true); f.querySelector(".ok").hidden = false; track("generate_lead", { lead_type: "free_class", audience: d.persona }); };
      if (!window.__npaEvent) { done(); return; }
      window.__npaEvent({ name: d.name, email: d.email, phone: d.phone, persona: d.persona }).then(done).catch(() => { busy(""); formError(f, "We couldn't save your seat. Please try again or message us on WhatsApp."); });
      return;
    }
    need((d.name||"").trim(), "Enter your full name.");
    need(validEmail(d.email), "Enter a valid email address, for example ada@gmail.com.");
    const first = d.name.trim().split(" ")[0];
    if (kind === "co-details"){ need(digits(d.phone).length >= 7, "Enter your WhatsApp number so we can add you to your cohort's group."); need(d.persona, "Tell us which best describes you."); need(d.agree, "Tick the box to accept the terms and payment policy.");
      const c = coState(); Object.assign(c, d, {agree:true, step:3}); coSave(c); coRender(); window.scrollTo({top:0,behavior:"smooth"}); }
    if (kind === "contact"){ need((d.message||"").trim().length >= 5, "Write a short message so we know how to help."); save("messages", {...d, first}); go("/contact/sent"); }
    if (kind === "waitlist"){ save("waitlist", {...d, first, course:f.dataset.course}); go("/waitlist/" + f.dataset.course + "/joined"); }
    if (kind === "instalment"){ need(digits(d.phone).length >= 7, "Enter your WhatsApp number so we can send your receipt.");
      const ct = country(d.country); formError(f, ""); busy("Opening secure payment…");
      const [month, variant] = String(d.item || "December").split(":");
      window.__npaPay({ kind:"instalment", month, switchTo: variant === "early" ? "early" : undefined, currency: chargeCode(), name:d.name, email:d.email, phone:ct.dial+" "+d.phone, country:ct.code })
        .then(r => { sset("npa-pending-instalment", {...d, first, month}); location.href = r.link; })
        .catch(err => { busy(""); formError(f, (err && err.message) || "We couldn't start the payment. Please try again."); });
    }
  }catch(err){ if (err !== 0) throw err; }
});

document.addEventListener("click", e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest("a[href]"); if (!a || a.target || a.hasAttribute("download") || a.hasAttribute("data-reload")) return;
  const href = a.getAttribute("href"); if (!href || !href.startsWith("/") || href.startsWith("//")) return;
  if (/^\/(admin|auth|api|student|reset-password|payment-return|sitemap|robots|brand)/.test(href)) return;
  e.preventDefault(); go(href);
});
}
export function renderNow(){ render(); }
export function renderStatic(path, search){
  path = (path || "/").replace(/\/+$/,"") || "/"; const q = parseQS(search || "");
  if (GEO) setCurrency(autoCurrency(GEO), "auto");
  let page = null;
  for (const [re, fn] of ROUTES){ const m = path.match(re); if (m){ try{ page = fn(q, m[1]); }catch(e){ page = null; } break; } }
  const found = !!page; if (!page) page = P.notFound();
  return { title: page.title, found, html: shell(path, page) };
}
