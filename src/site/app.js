
import logoDarkA from "@/assets/logo-dark.png.asset.json";
import logoLightA from "@/assets/logo-light.png.asset.json";

/* ============ Config ============ */
const SITE = { phone:"2349136713644", phoneLabel:"+234 913 671 3644", email:"info@npdacademy.com" };
const EARLY_END = new Date("2026-10-10T23:59:59+01:00");
const PRICE_EARLY = 60000, PRICE_MONTH = 40000;
const EVENT = { title:"Creating Your First Marketing Strategy", dateLabel:"Saturday 10 October 2026", timeLabel:"11:00 AM WAT", startUTC:"20261010T100000Z", endUTC:"20261010T110000Z" };
const COHORT_START = "Thursday 5 November 2026";
const wa = t => "https://wa.me/" + SITE.phone + "?text=" + encodeURIComponent(t);
const naira = n => "₦" + Number(n).toLocaleString("en-NG");
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* preview switch: /...?preview=closed or ?preview=open, remembered for the session */
function earlyOpen(){
  let p = null; try{ p = sessionStorage.getItem("npa-preview"); }catch(e){}
  if (p === "closed") return false;
  if (p === "open") return true;
  return Date.now() <= EARLY_END.getTime();
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
const FAQS = [
 ["The bootcamp",[
  ["Who is the bootcamp for?","Beginners and early-career marketers: career switchers, graduates, people already handling marketing at work, and business owners. Module 1 assumes no prior knowledge."],
  ["How much time does it take each week?","Plan for self-paced certification work from Monday to Wednesday and live online classes from Thursday to Sunday. Each module ends with a portfolio piece you build with feedback."],
  ["When does the next cohort start?","Classes start on " + COHORT_START + ". Orientation details are sent by email and WhatsApp once you enrol."],
  ["Which certifications will I earn?","Five industry-recognised certifications, earned module by module as you go, plus our certificate of completion when you finish the bootcamp."],
  ["What equipment do I need?","A laptop or smartphone with a stable internet connection and a Google account. A laptop makes the practical work easier."]
 ]],
 ["Paying",[
  ["What does it cost?","The early-bird price is ₦60,000 paid once, from Monday 28 September to Saturday 10 October 2026. After that, the bootcamp is ₦40,000 a month for three months: November, December and January."],
  ["How does the monthly plan work?","You pay the November instalment of ₦40,000 when you enrol. The December and January instalments are equal monthly payments of ₦40,000, payable on the 1st of every month. We send a payment link on WhatsApp and email three days before each date."],
  ["Can I pay from outside Nigeria?","Yes. Choose your country at checkout and pay in your local currency with mobile money (M-Pesa, MTN MoMo, Airtel Money, Orange Money or Wave), card, bank transfer or Instant EFT, depending on your country. You see the exact amount before you confirm."],
  ["Is my payment secure?","Yes. Payments are processed by our licensed payment partner. We never see or store your card details or wallet PIN."],
  ["Do you have a referral code?","If a graduate or ambassador referred you, enter their code at checkout so they get credit."]
 ]],
 ["The free event",[
  ["What is the free event?", EVENT.title + " is a one-hour live online session on " + EVENT.dateLabel + " at " + EVENT.timeLabel + ". You build a one-page strategy for a real business and take home the template."],
  ["What if I can't attend live?","Register anyway. Everyone who registers gets the replay and the template within 24 hours."]
 ]]
];
const POSTS = [
 {slug:"what-is-digital-marketing", title:"What is digital marketing? A plain-English guide for beginners", date:"September 2026", mins:"6 min read",
  intro:"Digital marketing is how businesses find, win and keep customers using the internet. Here is what it actually involves, and how people start a career in it.",
  body:`<p>Digital marketing is the work of reaching people online and persuading them to take an action: buy, sign up, call, visit or come back. It uses the same channels you already use every day, including search engines, social media, email, WhatsApp and websites.</p>
<p>What makes it different from traditional marketing is that almost everything can be measured. You can see how many people saw a post, clicked a link, filled a form or paid. That makes it easier to learn what works and to spend money more carefully.</p>
<h2>The main parts of digital marketing</h2>
<ul><li><b>Strategy:</b> deciding who you are trying to reach, what you are offering and which channels to use.</li><li><b>Content marketing:</b> creating useful posts, articles and videos that attract the right people.</li><li><b>Social media marketing:</b> building an audience and a community on platforms like Instagram, TikTok, LinkedIn and X.</li><li><b>Search engine optimisation (SEO):</b> helping your pages show up when people search on Google and in AI search tools.</li><li><b>Paid media:</b> running ads on Meta and Google to reach people faster.</li><li><b>Email and CRM:</b> staying in touch with customers and leads through email and WhatsApp.</li><li><b>Analytics:</b> tracking results so you know what to keep, fix or stop.</li></ul>
<h2>Why it matters for businesses in Africa</h2>
<p>Most customers now discover businesses on their phones. A small shop in Lagos, Accra or Nairobi can reach buyers in other cities, or other countries, without opening a new branch. Businesses that understand digital marketing grow faster and waste less money.</p>
<h2>Do you need a degree to work in digital marketing?</h2>
<p>No. Employers and clients care more about what you can show than what you studied. A portfolio of real work, recognised certifications and the ability to explain your results matter most. That is why practical training that makes you build things is more useful than theory alone.</p>
<h2>How to get started</h2>
<p>Start with strategy, because every other skill depends on it. Pick one business, describe its customer in one sentence, and choose two channels to focus on. Then learn one channel properly before adding the next.</p>`},
 {slug:"first-marketing-strategy", title:"How to create your first marketing strategy on one page", date:"September 2026", mins:"5 min read",
  intro:"A marketing strategy does not need to be a 40-page document. For most businesses, one clear page is enough to start. Here is how to write it.",
  body:`<p>A good marketing strategy answers four questions: who are we trying to reach, why should they care, where will we reach them, and how will we know it is working. If you can answer these clearly on one page, you have a strategy.</p>
<h2>1. Describe one customer in one sentence</h2>
<p>Resist the urge to say "everyone". Pick the customer most likely to buy first. For example: "Working mothers in Lagos who want healthy home-cooked meals but have no time to cook on weekdays." A specific customer makes every other decision easier.</p>
<h2>2. Write your positioning line</h2>
<p>Complete this sentence: "For [customer], we are the [category] that [main benefit], unlike [alternative]." It forces you to say what makes you different in words a customer would understand.</p>
<h2>3. Choose two or three channels</h2>
<p>Go where your customer already spends time. A business selling to young professionals might start with Instagram and WhatsApp. A business selling to companies might start with LinkedIn and email. Doing two channels well beats doing six badly.</p>
<h2>4. Set one goal you can measure in 30 days</h2>
<p>Make it a number: 50 new WhatsApp enquiries, 20 sales, 300 email subscribers. Then decide what you will check each week to see if you are on track.</p>
<h2>5. Put it on one page</h2>
<p>Customer, positioning, channels, goal and weekly checks. Share it with anyone who works on your marketing, and review it every month.</p>`},
 {slug:"digital-marketing-bootcamp-fees-nigeria", title:"Digital marketing bootcamp fees in Nigeria: what you should be paying for", date:"September 2026", mins:"4 min read",
  intro:"Bootcamp prices vary a lot. The price matters less than what you get for it. Here is a simple checklist to compare options before you pay.",
  body:`<p>If you are comparing digital marketing courses, you will see prices from free to several hundred thousand naira. Free resources are useful, but they rarely give you structure, feedback or proof of your skills. When you do pay, make sure you are paying for the things that make a difference.</p>
<h2>What to look for</h2>
<ul><li><b>Practical work:</b> do you build real things, like a strategy, an SEO audit or an ad campaign, or only watch videos?</li><li><b>Feedback:</b> does someone review your work and tell you how to improve it?</li><li><b>Recognised certifications:</b> will you finish with credentials employers and clients already trust?</li><li><b>Practising instructors:</b> are the teachers doing the work today, not just teaching it?</li><li><b>A portfolio at the end:</b> will you have work to show in an interview or a client pitch?</li><li><b>Flexible payment:</b> can you spread the cost if you need to?</li></ul>
<h2>How our bootcamp is priced</h2>
<p>Our Professional Digital Marketing Bootcamp costs ₦60,000 paid once during the early-bird week, from Monday 28 September to Saturday 10 October 2026. After that, it is ₦40,000 a month for three months: November, December and January. Both options include the same eight modules, five certifications, live classes and capstone project.</p>
<p>You can pay from Nigeria or anywhere else in Africa, in your local currency, with mobile money, card or bank transfer.</p>`}
];
const MOD_CERT = '<span class="pill green" style="margin-top:6px">Certification included</span>';
/* ============ Layout ============ */
function header(path){
  const on = p => (p === "/" ? path === "/" : path.startsWith(p)) ? ' class="on" aria-current="page"' : "";
  const bar = earlyOpen()
    ? `<div class="bar"><b>Early bird is open:</b> ₦60,000 paid once, until Saturday 10 October. <span class="cd" data-countdown="2026-10-10T23:59:59+01:00" data-label="left"></span><a href="/checkout?plan=early">Claim your seat</a></div>`
    : `<div class="bar"><b>Enrolment for the next cohort is open:</b> ₦40,000 a month for three months. <span class="cd" data-countdown="2026-11-05T09:00:00+01:00" data-label="until classes start"></span><a href="/checkout">Enrol now</a></div>`;
  return `<a class="skip" href="#main">Skip to content</a>${bar}<header class="top"><div class="wrap nav">
<a class="logo" href="/" aria-label="Nerdy Pixels Academy home"><img src="${logoDarkA.url}" alt="Nerdy Pixels Academy" style="height:50px;width:auto"></a>
<nav class="menu" aria-label="Main"><a href="/"${on("/")}>Home</a><a href="/courses"${on("/courses")}>Courses</a><a href="/blog"${on("/blog")}>Blog</a><a href="/faq"${on("/faq")}>FAQ</a><a href="/contact"${on("/contact")}>Contact Us</a></nav>
<div class="nav-cta"><a class="btn ghost sm" href="/events/first-marketing-strategy">Free event</a><a class="btn sm" href="/checkout">Enrol now</a></div>
<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" data-act="menu">${I.menu()}</button>
</div>
<nav class="drawer" id="drawer" aria-label="Mobile"><a href="/">Home</a><a href="/courses">Courses</a><a href="/courses/digital-marketing">Digital Marketing Bootcamp</a><a href="/events/first-marketing-strategy">Free event</a><a href="/blog">Blog</a><a href="/faq">FAQ</a><a href="/contact">Contact Us</a><a class="btn block" style="margin-top:12px;border:0" href="/checkout">Enrol now</a></nav>
</header>`;
}
function footer(){
  return `<section class="news" aria-label="Newsletter"><div class="wrap">
<div class="stack" style="gap:6px"><h2 style="font-size:22px">Free digital marketing tips, in your inbox</h2><p class="muted">Tutorials, event invites and career advice for African marketers. No spam, unsubscribe any time.</p></div>
<form data-form="newsletter" class="row" style="flex:1;max-width:520px;align-items:flex-end" novalidate>
<label class="f" style="flex:1;min-width:220px">Email address<input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>
<button class="btn deep" type="submit">Subscribe</button></form></div></section>
<footer><div class="wrap stack" style="gap:36px">
<div class="grid g4">
<div class="stack" style="gap:10px"><a class="logo" href="/"><img src="${logoLightA.url}" alt="Nerdy Pixels Academy" style="width:140px;height:auto"></a><p class="small" style="color:var(--on-dark-2)">Practical digital marketing training for Africa's emerging workforce.</p></div>
<div class="stack" style="gap:10px"><h3>Learn</h3><a href="/courses/digital-marketing">Digital Marketing Bootcamp</a><a href="/curriculum">Curriculum</a><a href="/courses">All courses</a><a href="/events/first-marketing-strategy">Free event</a><a href="/blog">Blog</a></div>
<div class="stack" style="gap:10px"><h3>Students</h3><a href="/onboarding">Student onboarding</a><a href="/pay-instalment">Pay an instalment</a><a href="/faq">FAQ</a><a href="/terms">Terms of enrolment</a><a href="/payment-policy">Payment policy</a><a href="/privacy">Privacy policy</a></div>
<div class="stack" style="gap:10px"><h3>Contact</h3><a href="mailto:${SITE.email}">${SITE.email}</a><a href="tel:+${SITE.phone}">${SITE.phoneLabel}</a><a href="${wa("Hello Nerdy Pixels Academy, I have a question.")}" target="_blank" rel="noopener">Chat on WhatsApp</a><a href="/contact">Contact form</a></div>
</div>
<p class="small" style="color:#BBAADC;border-top:1px solid var(--deep-line);padding-top:20px">© 2026 Nerdy Pixels Digital. All rights reserved.</p>
</div></footer>
<a class="wa-float" href="${wa("Hello Nerdy Pixels Academy, I'd like to know more about the bootcamp.")}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">${I.wa("#06301A",30)}</a>`;
}

/* ============ Shared blocks ============ */
function priceCard(){
  const open = earlyOpen();
  return `<aside class="price-card" aria-label="Price">
${open ? `<span class="pill green">Early bird: Mon 28 Sep to Sat 10 Oct</span><div class="price">₦60,000<small>paid once</small></div><p>Save 50% ₦60,000 when you pay once before 10th October, 2026.</p>`
       : `<span class="pill">Monthly plan</span><div class="price">₦40,000<small>a month</small></div><p>Three payments: November, December and January. Pay the first one when you enrol.</p>`}
<ul class="list" style="border-top:1px solid var(--line);padding-top:16px">${check("8 modules, 8 portfolio pieces")}${check("5 industry certifications")}${check("Capstone hackathon on real brand briefs")}${check("Mobile money, card and bank transfer across Africa")}</ul>
<a class="btn deep block" href="/checkout${open?"?plan=early":""}">Continue to checkout</a>
<p class="small muted row" style="justify-content:center;gap:8px">${I.lock()} Secure payment. Takes about two minutes.</p></aside>`;
}
function eventBand(){
  return `<div class="band"><div class="stack" style="gap:12px"><span class="eyebrow">Free live event, ${EVENT.dateLabel.replace(" 2026","")}</span><h2>${EVENT.title}</h2><p class="lead">Not ready to enrol yet? Spend an hour with our instructors, build a simple strategy for a real business, and take home the template.</p></div>
<div class="stack" style="gap:10px"><a class="btn deep block" href="/events/first-marketing-strategy">Save my free seat</a><p class="small muted" style="text-align:center">Online. Replay and template sent to everyone who registers.</p></div></div>`;
}
function instructors(){
  return `<div class="grid g3">${INSTRUCTORS.map(i=>`<div class="card row" style="flex-wrap:nowrap;padding:18px"><div class="avatar" aria-hidden="true">${i[0]}</div><div><div style="font-weight:600;color:var(--ink)">${i[1]}</div><div class="small muted">${i[2]}</div></div></div>`).join("")}</div>`;
}
function modulesList(){
  return MODULES.map(m=>`<article class="card module"><div class="num" aria-hidden="true">${m[0]}</div><div class="stack" style="gap:6px"><h3>Module ${m[0]}: ${m[1]}</h3><p class="muted">${m[2]}</p>${m[4]?MOD_CERT:""}</div><div class="out"><span>Portfolio output</span>${m[3]}</div></article>`).join("")
   + `<article class="card module dark" style="border:0"><div class="num" style="background:var(--purple);color:#fff">★</div><div class="stack" style="gap:6px"><h3>Capstone hackathon</h3><p style="color:var(--on-dark)">Work in a team on a live brief across industry tracks, present to a panel, and add the result to your portfolio.</p></div></article>`;
}
function faqBlock(items, openFirst){
  return items.map((q,i)=>`<details class="faq"${openFirst&&i<2?" open":""}><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join("");
}
function tel(dial, value){ return `<span class="tel"><span aria-hidden="true">${esc(dial)}</span><input type="tel" name="phone" autocomplete="tel-national" inputmode="tel" value="${esc(value||"")}" placeholder="801 234 5678" aria-label="WhatsApp number"></span>`; }
const personaSelect = v => `<select name="persona"><option value="">Select one</option>${[["switcher","Switching careers"],["graduate","Recent graduate"],["marketer","Already doing marketing at work"],["owner","Business owner"],["others","Others"]].map(o=>`<option value="${o[0]}"${o[0]===v?" selected":""}>${o[1]}</option>`).join("")}</select>`;
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim());
const digits = s => String(s||"").replace(/\D/g,"");
function formError(form, msg){
  let box = form.querySelector(".err");
  if (!msg){ if (box) box.remove(); return; }
  if (!box){ box = document.createElement("p"); box.className = "err"; box.setAttribute("role","alert"); const btn = form.querySelector("[type=submit]"); btn.parentNode.insertBefore(box, btn); }
  box.textContent = msg; box.scrollIntoView({block:"center",behavior:"smooth"});
}
const TOPICS = ["SEO","Social media marketing","Google Ads","Meta ads","Web analytics","Content strategy","Email marketing","AI marketing tools","Brand projects","Career launch"];
function marquee(){ const t = TOPICS.map(x=>`<span>${x}</span>`).join(""); return `<section class="marquee" aria-label="What you'll learn"><div class="marquee-track" aria-hidden="false">${t}</div><div class="marquee-track" aria-hidden="true">${t}</div></section>`; }
function stickyEnrol(){ return `<div class="sticky-enrol"><div><b>${naira(PRICE_EARLY)}</b><span class="small"> early bird or ${naira(PRICE_MONTH)}/month</span></div><a class="btn green sm" href="/checkout">Enrol now</a></div>`; }
/* ============ Pages ============ */
const P = {};

P.home = () => ({ title:"Nerdy Pixels Academy | Digital skills for Africa's emerging workforce", html:`
<section class="hero"><div class="wrap hero-grid">
<div class="stack" style="gap:22px"><span class="eyebrow">Nerdy Pixels Academy</span>
<h1>Practical digital marketing training <span class="accent">for Africa's emerging workforce.</span></h1>
<p class="lead">Learn the skills companies are hiring for, from marketers who do the work every day. Earn recognised certifications, build a portfolio, and pay from anywhere in Africa.</p>
<div class="row"><a class="btn green" href="/courses/digital-marketing">Explore the bootcamp →</a><a class="btn ghost" href="/curriculum">See the curriculum</a></div></div>
${priceCard()}
</div></section>${marquee()}
<section class="section"><div class="wrap stack" style="gap:28px">
<div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><h2>Enrolling now: Professional Digital Marketing Bootcamp</h2><p class="lead">Eight modules, five certifications and live classes. The next cohort starts ${COHORT_START}.</p></div><a href="/courses/digital-marketing" style="font-weight:600">View the bootcamp</a></div>
<div class="grid g4">${[["8","practical modules"],["5","industry certifications"],["Thu to Sun","live online classes"],["1","live brand project"]].map(s=>`<div class="card"><div style="font-size:28px;font-weight:800;color:var(--ink)">${s[0]}</div><div class="muted">${s[1]}</div></div>`).join("")}</div>
</div></section>
<section class="section tint"><div class="wrap stack" style="gap:28px"><h2>Built for four kinds of people</h2>
<div class="grid g4">${PERSONAS.map((p,i)=>`<div class="card stack persona" style="gap:8px"><span class="nbadge">${i+1}</span><h3>${p[0]}</h3><p class="muted">${p[1]}</p></div>`).join("")}</div>
<div><a class="btn" href="/courses/digital-marketing">Find out if it's right for you</a></div></div></section>
<section class="section"><div class="wrap stack" style="gap:28px"><div class="row" style="justify-content:space-between;align-items:flex-end"><h2>More programmes</h2><a href="/courses" style="font-weight:600">All courses</a></div>
<div class="grid g3">${COURSES.slice(0,3).map(c=>`<div class="card stack" style="gap:10px"><span class="pill">${c.weeks}</span><h3>${c.name}</h3><p class="muted">${c.text}</p><a href="/waitlist/${c.slug}" style="font-weight:600;margin-top:auto">Join the waitlist</a></div>`).join("")}</div></div></section>
<section class="section" style="padding-top:0"><div class="wrap">${eventBand()}</div></section>
<section class="section tint"><div class="wrap stack" style="gap:28px"><h2>Taught by working marketers</h2>${instructors()}</div></section>
<section class="section"><div class="wrap stack" style="gap:28px"><div class="row" style="justify-content:space-between;align-items:flex-end"><h2>From the blog</h2><a href="/blog" style="font-weight:600">All articles</a></div>${postCards()}</div></section>`});

P.courses = () => ({ title:"Courses | Nerdy Pixels Academy", html:`
<section class="hero"><div class="wrap stack" style="gap:16px"><h1>Courses</h1><p class="lead">Start with the flagship bootcamp, or join the waitlist for a specialist programme.</p></div></section>
<section class="section"><div class="wrap stack" style="gap:28px">
<article class="card" style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:32px;padding:32px;border:2px solid var(--purple)">
<div class="stack" style="gap:12px"><span class="pill green">Enrolling now</span><h2>Professional Digital Marketing Bootcamp</h2><p class="lead">Eight modules, five certifications, live classes Thursday to Sunday and a capstone hackathon. The next cohort starts ${COHORT_START}.</p>
<div class="row"><a class="btn" href="/courses/digital-marketing">View the bootcamp</a><a class="btn ghost" href="/curriculum">See the curriculum</a></div></div>
<div class="stack" style="gap:8px;justify-content:center"><div class="price">${earlyOpen()?"₦60,000":"₦40,000"}<small>${earlyOpen()?"paid once, until 10 Oct":"a month for 3 months"}</small></div><p class="muted">${earlyOpen()?"Or ₦40,000 a month for November, December and January.":"November, December and January."}</p></div>
</article>
<h2 style="margin-top:12px">Specialist programmes</h2>
<div class="grid g3">${COURSES.map(c=>`<div class="card stack" style="gap:10px"><span class="pill">${c.weeks}</span><h3>${c.name}</h3><p class="muted">${c.text}</p><a class="btn ghost sm" style="margin-top:auto;align-self:flex-start" href="/waitlist/${c.slug}">Join the waitlist</a></div>`).join("")}</div>
</div></section>`});

P.bootcamp = () => { const open = earlyOpen(); return { title:"Digital Marketing Bootcamp, next cohort | Nerdy Pixels Academy", html:`
<nav class="subnav" aria-label="On this page"><div class="wrap"><b>Digital Marketing Bootcamp</b>${[["overview","Overview"],["curriculum","Curriculum"],["certifications","Certifications"],["pricing","Pricing"],["event","Free event"],["faq","FAQ"]].map(a=>`<a href="/courses/digital-marketing?s=${a[0]}">${a[1]}</a>`).join("")}</div></nav>
<section class="hero" id="overview"><div class="wrap hero-grid">
<div class="stack" style="gap:22px"><span class="eyebrow">Professional Digital Marketing Bootcamp. The next cohort starts ${COHORT_START}</span>
<h1>Become a job-ready digital marketer. <span class="accent">Certified, with a portfolio to prove it.</span></h1>
<p class="lead">Eight practical modules taught live by working marketers. Every module ends with a portfolio piece, and you finish with a live project for a real brand.</p>
<div class="row"><a class="btn green" href="/checkout${open?"?plan=early":""}">Enrol in the next cohort →</a><a class="btn ghost" href="/curriculum">See the curriculum</a></div>
<ul class="list row" style="flex-direction:row;gap:20px">${check("Live classes Thursday to Sunday")}${check("Pay from anywhere in Africa")}${check("Monthly plan available")}</ul></div>
${priceCard()}</div></section>
<section class="stats wrap" aria-label="At a glance" style="padding:0">${[["8","practical modules"],["5","industry certifications"],["Thu to Sun","live online classes"],["1","live brand project"]].map(s=>`<div><b>${s[0]}</b><span class="muted small">${s[1]}</span></div>`).join("")}</section>
<section class="section"><div class="wrap stack" style="gap:28px"><h2>Built for four kinds of people</h2><div class="grid g4">${PERSONAS.map((p,i)=>`<div class="card stack persona" style="gap:8px"><span class="nbadge">${i+1}</span><h3>${p[0]}</h3><p class="muted">${p[1]}</p></div>`).join("")}</div></div></section>
<section class="section tint" id="curriculum"><div class="wrap stack" style="gap:24px">
<div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><h2>What you'll learn, and what you'll build</h2><p class="lead">One module a week. Monday to Wednesday is self-paced certification work; Thursday to Sunday is live classes and practice.</p></div><a href="/curriculum" style="font-weight:600">See the full weekly plan</a></div>
<div class="stack" style="gap:14px">${modulesList()}</div></div></section>
<section class="section dark" id="certifications"><div class="wrap stack" style="gap:28px">
<div class="stack" style="gap:12px;max-width:760px"><h2>Five certifications in one programme</h2><p style="font-size:17px">Earn industry-recognised certifications module by module, plus our certificate of completion when you finish.</p></div>
<div class="grid g3">${[["Earned as you go","Certification work is built into the modules, Monday to Wednesday."],["Recognised by employers","Proof of skill that hiring managers and clients already know."],["Ready for your CV","Add each one to your CV and LinkedIn as soon as you pass."]].map(c=>`<div class="card stack" style="gap:8px">${I.check("#25D366",24)}<h3 style="font-size:17px">${c[0]}</h3><p class="small">${c[1]}</p></div>`).join("")}</div></div></section>
<section class="section" id="pricing"><div class="wrap stack" style="gap:28px">
<div class="stack" style="gap:8px"><h2>Choose how you pay</h2><p class="lead">Same bootcamp, same certifications. Pay once at the early-bird price, or spread it over three months.</p></div>
<div class="grid g2">
<div class="plan ${open?"on":"off"}"><div class="row" style="justify-content:space-between"><h3 style="font-size:22px">Early bird</h3><span class="pill green">${open?"Ends Sat 10 Oct":"Closed"}</span></div><div class="price">₦60,000<small>paid once</small></div><p class="muted">Available Monday 28 September to Saturday 10 October 2026. You save ₦60,000 compared with the monthly plan.</p>${open?`<a class="btn block" href="/checkout?plan=early">Pay ₦60,000 now</a>`:`<span class="btn ghost block" aria-disabled="true" style="cursor:default">Early bird has closed</span>`}</div>
<div class="plan ${open?"":"on"}"><div class="row" style="justify-content:space-between"><h3 style="font-size:22px">Monthly plan</h3><span class="pill">3 payments</span></div><div class="price">₦40,000<small>a month</small></div><div class="months"><div>November<b>On enrolment</b></div><div>December<b>By 1 Dec</b></div><div>January<b>By 1 Jan</b></div></div><a class="btn deep block" href="/checkout?plan=monthly">Start with ₦40,000</a></div>
</div>
<div class="card row" style="flex-wrap:nowrap;align-items:flex-start;background:var(--soft-2)">${I.globe()}<p><b>Paying from outside Nigeria?</b> Choose your country at checkout and pay in local currency: M-Pesa in Kenya and Tanzania, mobile money in Ghana, Uganda, Rwanda, Zambia and francophone West and Central Africa, Instant EFT in South Africa, or card anywhere.</p></div>
</div></section>
<section class="section" id="event" style="padding-top:0"><div class="wrap">${eventBand()}</div></section>
<section class="section tint"><div class="wrap stack" style="gap:28px"><h2>Taught by working marketers</h2>${instructors()}</div></section>
<section class="section" id="faq"><div class="wrap grid" style="grid-template-columns:minmax(0,.8fr) minmax(0,1.6fr);gap:40px">
<div class="stack" style="gap:14px"><h2>Questions, answered</h2><p class="muted">Still unsure? Talk to an advisor on WhatsApp and get an answer the same day.</p><a class="btn green" style="align-self:flex-start" href="${wa("Hello, I have a question about the Digital Marketing Bootcamp.")}" target="_blank" rel="noopener">${I.wa()} Chat with an advisor</a><a href="/faq" style="font-weight:600">See all FAQs</a></div>
<div class="stack" style="gap:12px">${faqBlock(FAQS[0][1].slice(0,3).concat(FAQS[1][1].slice(0,3)), true)}</div></div></section>
<section class="section dark"><div class="wrap row" style="justify-content:space-between;gap:24px"><div class="stack" style="gap:8px"><h2>The next cohort starts ${COHORT_START.replace(" 2026","")}.</h2><p style="font-size:17px">${open?"Early bird ends Saturday 10 October: ₦60,000 paid once.":"₦40,000 a month for November, December and January."}</p></div><a class="btn" href="/checkout${open?"?plan=early":""}">Enrol now</a></div></section>
<style>@media (max-width:820px){#faq .wrap{grid-template-columns:1fr!important}}</style>`};};

P.curriculum = () => ({ title:"Curriculum | Digital Marketing Bootcamp | Nerdy Pixels Academy", html:`
<section class="hero"><div class="wrap stack" style="gap:16px"><span class="eyebrow">Professional Digital Marketing Bootcamp</span><h1>The curriculum, week by week</h1><p class="lead">Eight modules and a capstone hackathon. Each week you learn one discipline, practise it live, and add a finished piece to your portfolio.</p><div class="row"><a class="btn" href="/checkout">Enrol in the next cohort</a><a class="btn ghost" href="/courses/digital-marketing">Back to the bootcamp</a></div></div></section>
<section class="section"><div class="wrap stack" style="gap:24px"><h2>How a week works</h2>
<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${[["Mon to Wed","Self-paced","Certification lessons and reading, at your own pace."],["Thursday","Live class","Core concepts for the week."],["Friday","Live class","Going deeper, with the tools."],["Saturday","Live class","Applying it to real examples."],["Sunday","Build session","Your portfolio piece, with feedback."]].map((r,i)=>`<div class="card stack" style="gap:6px;${i?"background:var(--deep);border-color:var(--deep);color:#fff":""}"><b style="font-size:17px;${i?"color:#fff":"color:var(--ink)"}">${r[0]}</b><span class="small" style="font-weight:600;opacity:.85">${r[1]}</span><span class="small">${r[2]}</span></div>`).join("")}</div>
<p class="muted small">Live classes are online. Session times and the holiday break are confirmed at orientation.</p></div></section>
<section class="section tint"><div class="wrap stack" style="gap:14px"><h2 style="margin-bottom:10px">Modules and portfolio outputs</h2>${modulesList()}</div></section>
<section class="section"><div class="wrap">${eventBand()}</div></section>`});

P.onboarding = () => { const o = lastOf("orders"); return { title:"Student onboarding | Nerdy Pixels Academy", html:`
<section class="section dark"><div class="wrap hero-grid">
<div class="stack" style="gap:16px"><span style="font-weight:600;color:#D2BCFF">Student onboarding</span><h1 style="color:#fff">${o?`Welcome, ${esc(o.first)}.`:"Welcome to the Digital Marketing Bootcamp."}</h1><p style="font-size:18px">Everything you need before your first class: your checklist, the weekly rhythm, the curriculum and your payment dates.</p></div>
<div class="card stack" style="gap:12px">${[["Orientation","Details sent by email and WhatsApp"],["First live class",COHORT_START.replace(" 2026","")],["December instalment","Due 1 December"],["January instalment","Due 1 January"]].map(r=>`<div class="sumrow" style="border-bottom:1px solid var(--deep-line);padding-bottom:10px"><span style="color:var(--on-dark-2)">${r[0]}</span><b style="color:#fff">${r[1]}</b></div>`).join("")}</div></div></section>
<section class="section tint" id="checklist"><div class="wrap grid" style="grid-template-columns:minmax(0,.8fr) minmax(0,1.6fr);gap:40px">
<div class="stack" style="gap:10px"><h2>Before your first class</h2><p class="muted">Six steps, about 30 minutes in total. Finish them before orientation.</p></div>
<ol class="list" style="gap:12px">${[["Join your cohort's WhatsApp group","Class links, reminders and announcements go here first.",`<a class="btn green sm" href="${wa("Hello, I've enrolled in the bootcamp. Please add me to my cohort's WhatsApp group.")}" target="_blank" rel="noopener">${I.wa("#06301A",18)} Request my group link</a>`],["Complete your student profile","Name for your certificate, country, and your goal for the bootcamp.",`<a class="btn ghost sm" href="https://forms.gle/9Yt5Pa5kT5F19MYN8" target="_blank" rel="noopener">Complete my profile</a>`],["Create your learning accounts","Set up the free certification platform accounts listed in your welcome email.",""],["Set up your tools","A laptop or smartphone with a stable internet connection and a Google account.",""],["Attend orientation","Meet your instructors and cohort, and get the week-by-week calendar.",""],["Save your payment dates","Monthly plan: December and January instalments are due on the 1st.",`<a class="btn ghost sm" href="/pay-instalment">Pay an instalment</a>`]].map((c,i)=>`<li class="card row" style="flex-wrap:nowrap;align-items:flex-start"><span class="avatar" style="width:36px;height:36px;font-size:15px">${i+1}</span><div class="stack" style="gap:8px"><b style="color:var(--ink)">${c[0]}</b><span class="muted">${c[1]}</span>${c[2]?`<div>${c[2]}</div>`:""}</div></li>`).join("")}</ol></div></section>
<section class="section"><div class="wrap stack" style="gap:16px"><h2>Your curriculum</h2><p class="lead">Eight modules and a capstone hackathon, one module a week.</p><div><a class="btn" href="/curriculum">Open the full curriculum</a></div></div></section>
<section class="section tint" id="payments"><div class="wrap grid g2" style="gap:32px;align-items:start">
<div class="stack" style="gap:12px"><h2>Your payments</h2><p class="lead">If you paid the ₦60,000 early-bird price, you're fully paid. On the monthly plan, pay ₦40,000 by the 1st of December and January. We send a payment link three days before each date, and you can pay with the same methods you used at checkout.</p></div>
<div class="card stack" style="gap:12px">${o?`<div class="sumrow"><span>Your plan</span><b>${o.plan==="early"?"Early bird, paid in full":"Monthly plan"}</b></div>`:""}<div class="sumrow"><span>November</span><b style="color:var(--green-ink)">Paid at enrolment</b></div><div class="sumrow"><span>December</span><b>₦40,000 by 1 Dec</b></div><div class="sumrow"><span>January</span><b>₦40,000 by 1 Jan</b></div><a class="btn block" href="/pay-instalment">Pay my next instalment</a></div></div></section>
<section class="section"><div class="wrap band"><div class="stack" style="gap:6px"><h2 style="font-size:26px">Need help getting set up?</h2><p>Message the student support team on WhatsApp or email ${SITE.email}.</p></div><a class="btn green" href="${wa("Hello, I need help with my bootcamp onboarding.")}" target="_blank" rel="noopener">${I.wa()} Message student support</a></div></section>
<style>@media (max-width:820px){#checklist .wrap{grid-template-columns:1fr!important}}</style>`};};
P.event = () => ({ title:EVENT.title + " | Free event | Nerdy Pixels Academy", html:`
<section class="hero"><div class="wrap hero-grid" style="align-items:start">
<div class="stack" style="gap:22px"><span class="pill" style="align-self:flex-start">Free live event</span><h1>${EVENT.title}</h1>
<p class="lead">A practical, hands-on session for beginners. Bring a business, yours or one you admire, and leave with a one-page strategy you can use the next day.</p>
<div class="grid g3">${[["Date",EVENT.dateLabel.replace(" 2026","")],["Time",EVENT.timeLabel],["Where","Online, free"]].map(r=>`<div class="card" style="padding:16px"><div class="small muted">${r[0]}</div><b style="color:var(--ink)">${r[1]}</b></div>`).join("")}</div>
<h2 style="font-size:24px;margin-top:8px">In one hour, you'll learn</h2>
<ul class="list">${check("How to pick one audience and describe them in a sentence")}${check("How to write a positioning line people remember")}${check("Which two or three channels to start with, and why")}${check("How to set a goal you can measure in 30 days")}</ul>
<h2 style="font-size:24px;margin-top:8px">Everyone who registers gets</h2>
<div class="grid g3">${[["The strategy template","The one-page template used in class."],["The full replay","Sent within 24 hours, even if you miss it."],["Live Q&amp;A","Ask our instructors about careers in marketing."]].map(r=>`<div class="card stack" style="gap:6px"><b style="color:var(--ink)">${r[0]}</b><span class="small muted">${r[1]}</span></div>`).join("")}</div>
<p class="muted">Want a head start? Read <a href="/blog/first-marketing-strategy">How to create your first marketing strategy on one page</a>.</p>
</div>
<form class="price-card" data-form="event" novalidate>
<h2 style="font-size:24px">Save your free seat</h2>
<label class="f">Full name<input name="name" autocomplete="name" required></label>
<label class="f">Email address<input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>
<label class="f">Country<select name="country" data-dial-target="ev-dial">${countryOptions("NG")}</select></label>
<label class="f">WhatsApp number<span class="tel"><span id="ev-dial" aria-hidden="true">+234</span><input type="tel" name="phone" autocomplete="tel-national" inputmode="tel" placeholder="801 234 5678"></span></label>
<label class="f">Which best describes you?${personaSelect("")}</label>
<label class="f">Referral code (optional)<input name="ref"></label>
<button class="btn block" type="submit">Register for free</button>
<p class="small muted">We'll send your joining link and reminders by email and WhatsApp. See our <a href="/privacy">privacy policy</a>.</p>
</form></div></section>
<section class="section"><div class="wrap stack" style="gap:24px"><h2>Your hosts</h2><p class="lead">Led by Nerdy Pixels Academy instructors who run marketing for brands every day.</p>${instructors()}</div></section>`});

P.eventDone = () => { const r = lastOf("events"); const open = earlyOpen();
  const gcal = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(EVENT.title + " (Nerdy Pixels Academy)") + "&dates=" + EVENT.startUTC + "/" + EVENT.endUTC + "&details=" + encodeURIComponent("Free live event. Your joining link is in your email.");
  return { title:"You're registered | Nerdy Pixels Academy", html:`
<section class="section"><div class="wrap" style="max-width:720px"><div class="stack" style="gap:20px">
<div class="ok-icon">${I.check("#0F7A3C",34)}</div>
<h1 style="font-size:clamp(30px,4vw,44px)">You're registered${r?", "+esc(r.first):""}.</h1>
<p class="lead">Your joining link for ${EVENT.title} is on its way${r?" to "+esc(r.email):""}. It's on ${EVENT.dateLabel} at ${EVENT.timeLabel}. Two quick things so you don't miss it:</p>
<div class="grid g2"><a class="btn deep" href="${gcal}" target="_blank" rel="noopener">Add to Google Calendar</a><a class="btn green" href="${wa("Hi, I registered for " + EVENT.title + ". Please send me reminders on WhatsApp.")}" target="_blank" rel="noopener">${I.wa()} Get reminders on WhatsApp</a></div>
<div class="card stack" style="gap:10px;margin-top:10px"><h2 style="font-size:22px">Ready for the full programme?</h2><p class="muted">${open?"Early bird is ₦60,000 paid once, until Saturday 10 October.":"The next cohort starts " + COHORT_START + ". Join from ₦40,000 a month for three months."}</p><div class="row"><a class="btn" href="/checkout${open?"?plan=early":""}">See plans for the next cohort</a><a class="btn ghost" href="/curriculum">See the curriculum</a></div></div>
<a href="/blog" style="font-weight:600">Read our beginner guides while you wait</a>
</div></div></section>`};};

/* ---------- Checkout ---------- */
function coState(){ return sget("npa-co") || { step:1, country:"NG", plan:null, method:null, name:"", email:"", phone:"", persona:"", source:"", ref:"", agree:false }; }
function coSave(c){ sset("npa-co", c); }
function coPlan(c){ let p = c.plan || (earlyOpen()?"early":"monthly"); if (p==="early" && !earlyOpen()) p = "monthly"; return p; }
P.checkout = (q) => { const c = coState(); if (q.plan==="early"||q.plan==="monthly"){ c.plan=q.plan; } if (!c.step || c.step>3) c.step=1; coSave(c);
  return { title:"Checkout | Nerdy Pixels Academy", html:`<section class="section" style="padding-top:40px"><div class="wrap co"><div id="co" class="stack" style="gap:26px"></div><aside id="co-sum" class="summary" aria-label="Order summary"></aside></div></section>`, mount: coRender };};
function coRender(){
  const c = coState(), plan = coPlan(c), ct = country(c.country), open = earlyOpen();
  const method = ct.methods.find(m=>m[0]===c.method) ? c.method : ct.methods[0][0];
  const amount = plan==="early" ? PRICE_EARLY : PRICE_MONTH, local = ct.code!=="NG";
  const localNote = `<p class="small" style="background:var(--soft);padding:12px 14px;border-radius:10px">Charged in ${ct.curName} (${ct.cur}). You'll see the exact ${ct.cur} amount on the secure payment screen before you confirm.</p>`;
  const steps = `<ol class="steps" aria-label="Checkout steps">${["Plan","Your details","Payment"].map((s,i)=>`<li class="${c.step===i+1?"on":c.step>i+1?"done":""}"${c.step===i+1?' aria-current="step"':""}><i>${c.step>i+1?"✓":i+1}</i>${s}</li>`).join("")}</ol>`;
  let body = "";
  if (c.step===1) body = `<h1 style="font-size:clamp(26px,3vw,34px)">Choose your plan</h1>
<label class="f">Where will you pay from?<select id="co-country">${countryOptions(ct.code)}</select></label>${local?localNote:""}
<div class="stack" style="gap:14px" role="radiogroup" aria-label="Plan">
<button type="button" role="radio" aria-checked="${plan==="early"}" class="choice ${plan==="early"?"on":""}" data-act="co-plan" data-v="early"${open?"":" disabled"}><span class="radio"></span><span class="stack" style="gap:4px;flex:1"><span class="row" style="justify-content:space-between"><b style="font-size:18px;color:var(--ink)">Early bird, paid once</b><b style="font-size:20px;color:var(--ink)">₦60,000</b></span><span class="small">Monday 28 September to Saturday 10 October only. Saves ₦60,000.</span><span class="small" style="font-weight:700;color:var(--green-ink)">${open?"Ends Saturday 10 October":"Early bird has closed"}</span></span></button>
<button type="button" role="radio" aria-checked="${plan==="monthly"}" class="choice ${plan==="monthly"?"on":""}" data-act="co-plan" data-v="monthly"><span class="radio"></span><span class="stack" style="gap:4px;flex:1"><span class="row" style="justify-content:space-between"><b style="font-size:18px;color:var(--ink)">Monthly plan</b><b style="font-size:20px;color:var(--ink)">₦40,000 <span class="small muted" style="font-weight:500">a month</span></b></span><span class="small">Three payments: November (today), 1 December and 1 January. ₦120,000 in total.</span></span></button>
</div>
<button class="btn block" type="button" data-act="co-step" data-v="2">Continue</button>`;
  if (c.step===2) body = `<h1 style="font-size:clamp(26px,3vw,34px)">Your details</h1><p class="muted" style="margin-top:-12px">We use these for your receipt, your certificate and your cohort's WhatsApp group.</p>
<form data-form="co-details" class="stack" style="gap:16px" novalidate><div class="grid g2">
<label class="f">Full name<input name="name" autocomplete="name" value="${esc(c.name)}" placeholder="As it should appear on your certificate"></label>
<label class="f">Email address<input type="email" name="email" autocomplete="email" value="${esc(c.email)}" placeholder="you@example.com"></label>
<label class="f">WhatsApp number${tel(ct.dial, c.phone)}</label>
<label class="f">Which best describes you?${personaSelect(c.persona)}</label>
<label class="f">How did you hear about us?<select name="source"><option value="">Select one</option>${[["blog","Our blog"],["landing","Our website"],["partner","A partner organisation"],["email","Email from us"],["whatsapp","WhatsApp"],["friend","A friend or graduate"],["event","The free event"],["other","Somewhere else"]].map(o=>`<option value="${o[0]}"${o[0]===c.source?" selected":""}>${o[1]}</option>`).join("")}</select></label>
<label class="f">Referral code (optional)<input name="ref" value="${esc(c.ref)}" placeholder="For example AMB-TOLU"></label></div>
<label class="check" style="cursor:pointer"><input type="checkbox" name="agree" ${c.agree?"checked":""} style="width:20px;height:20px;margin-top:3px;flex:none"><span class="small">I accept the <a href="/terms" target="_blank">terms of enrolment</a> and <a href="/payment-policy" target="_blank">payment policy</a>, and I'm happy to receive class updates on WhatsApp and email.</span></label>
<div class="row"><button class="btn ghost" type="button" data-act="co-step" data-v="1">Back</button><button class="btn" type="submit" style="flex:1">Continue to payment</button></div></form>`;
  if (c.step===3) body = `<h1 style="font-size:clamp(26px,3vw,34px)">How would you like to pay?</h1><p class="muted" style="margin-top:-12px">Options for ${esc(ct.name)}. <button type="button" class="linkish" data-act="co-step" data-v="1" style="border:0;background:none;padding:0;color:var(--purple-ink);font:inherit;font-weight:600;text-decoration:underline;cursor:pointer">Change country</button></p>
<div class="stack" style="gap:12px" role="radiogroup" aria-label="Payment method">${ct.methods.map(m=>`<button type="button" role="radio" aria-checked="${m[0]===method}" class="choice ${m[0]===method?"on":""}" data-act="co-method" data-v="${m[0]}"><span class="radio"></span><span class="stack" style="gap:2px;flex:1"><b style="color:var(--ink)">${m[1]}</b><span class="small muted">${m[2]}</span></span></button>`).join("")}</div>
${local?localNote:""}
<div class="row"><button class="btn ghost" type="button" data-act="co-step" data-v="2">Back</button><button class="btn green" type="button" data-act="co-pay" style="flex:1">${I.lock("#06301A")} Pay ${naira(amount)}${local?" in "+ct.cur:""}</button></div>
<p class="small muted">Payments are processed securely by our licensed payment partner. We never see or store your card details or wallet PIN.</p>`;
  document.getElementById("co").innerHTML = `<a href="/courses/digital-marketing" style="font-weight:600;text-decoration:none">Back to the bootcamp</a>${steps}<div class="mobile-due"><span class="small">${plan==="early"?"Early bird, paid once":"Monthly plan, due today"}</span><b style="font-size:20px;color:var(--ink)">${naira(amount)}</b></div>${body}`;
  document.getElementById("co-sum").innerHTML = `<h2 style="font-size:18px">Order summary</h2><div><b style="color:var(--ink)">Professional Digital Marketing Bootcamp</b><div class="small muted">Next cohort, classes start ${COHORT_START.replace(" 2026","")}</div></div>
<div class="sumrow" style="border-top:1px solid var(--line);padding-top:12px"><span>Plan</span><b style="color:var(--ink)">${plan==="early"?"Early bird, paid once":"Monthly plan, 3 payments"}</b></div>
${plan==="monthly"?`<div class="sumrow"><span>Total over 3 months</span><span>₦120,000</span></div>`:""}
<div class="sumrow" style="border-top:1px solid var(--line);padding-top:12px;align-items:baseline"><b>${plan==="early"?"Total to pay":"Due today (November)"}</b><b style="font-size:26px;color:var(--ink)">${naira(amount)}</b></div>
${local?`<span class="small muted">Paying in ${ct.cur} from ${esc(ct.name)}</span>`:""}
<ul class="list small" style="border-top:1px solid var(--line);padding-top:12px">${check("8 modules and 8 portfolio pieces")}${check("5 industry certifications")}${check("Live classes Thursday to Sunday")}${check("Capstone hackathon")}</ul>
<p class="small muted row" style="gap:8px">${I.lock()} Secure, encrypted checkout</p>`;
}
P.checkoutDone = () => { const o = sget("npa-last-order"); if (!o) return P.notFound();
  return { title:"Payment confirmed | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:760px"><div class="stack" style="gap:20px">
<div class="ok-icon">${I.check("#0F7A3C",34)}</div><h1 style="font-size:clamp(30px,4vw,44px)">You're in, ${esc(o.first)}.</h1>
<p class="lead">Your seat in the next cohort is confirmed. Your receipt and welcome email are on their way to ${esc(o.email)}. Order reference <b>${esc(o.ref)}</b>.</p>
<div class="card stack" style="gap:10px"><h2 style="font-size:18px">Payment details</h2><div class="sumrow"><span>Plan</span><b>${o.plan==="early"?"Early bird, paid in full":"Monthly plan"}</b></div><div class="sumrow"><span>Paid today</span><b>${naira(o.amount)}${o.cur!=="NGN"?" (charged in "+o.cur+")":""}</b></div><div class="sumrow"><span>Method</span><b>${esc(o.methodLabel)}</b></div>
${o.plan==="monthly"?`<div class="sumrow" style="border-top:1px solid var(--line);padding-top:10px"><span>December</span><span>₦40,000 due 1 Dec</span></div><div class="sumrow"><span>January</span><span>₦40,000 due 1 Jan</span></div><p class="small muted">We'll send a payment link on WhatsApp and email three days before each due date.</p>`:""}</div>
<h2 style="font-size:20px">Your next three steps</h2>
<div class="stack" style="gap:12px">
<a class="btn green" style="justify-content:flex-start" href="${wa("Hello, I've just enrolled (order " + o.ref + "). Please add me to my cohort's WhatsApp group.")}" target="_blank" rel="noopener">${I.wa()} 1. Join your cohort's WhatsApp group</a>
<a class="btn deep" style="justify-content:flex-start" href="/onboarding">2. Complete your onboarding checklist</a>
<a class="btn ghost" style="justify-content:flex-start" href="/curriculum">3. Look through the curriculum</a></div>
</div></div></section>`};};

/* ---------- Instalments ---------- */
P.instalment = () => { const o = lastOf("orders") || {};
  return { title:"Pay an instalment | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap co">
<form class="stack" data-form="instalment" style="gap:18px" novalidate><h1 style="font-size:clamp(28px,3.5vw,40px)">Pay a monthly instalment</h1><p class="lead">For students on the monthly plan. December and January instalments are ₦40,000 each, due on the 1st of the month.</p>
<div class="grid g2"><label class="f">Full name<input name="name" autocomplete="name" value="${esc(o.name||"")}"></label><label class="f">Email you enrolled with<input type="email" name="email" autocomplete="email" value="${esc(o.email||"")}"></label>
<label class="f">Country<select name="country" data-dial-target="in-dial">${countryOptions(o.country||"NG")}</select></label>
<label class="f">WhatsApp number<span class="tel"><span id="in-dial" aria-hidden="true">${country(o.country||"NG").dial}</span><input type="tel" name="phone" autocomplete="tel-national" inputmode="tel" value="${esc(o.phone||"")}"></span></label>
<label class="f">Which instalment?<select name="month"><option value="December">December (due 1 Dec)</option><option value="January">January (due 1 Jan)</option></select></label>
<label class="f">Order reference (optional)<input name="ref" value="${esc(o.ref||"")}" placeholder="For example NPA-48213"></label></div>
<button class="btn green" type="submit">${I.lock("#06301A")} Continue to pay ₦40,000</button>
<p class="small muted">Paid in full at the early-bird price? You have nothing more to pay. Questions: <a href="/contact?topic=payment">contact us</a>.</p></form>
<aside class="summary"><h2 style="font-size:18px">Monthly plan schedule</h2><div class="sumrow"><span>November</span><b style="color:var(--green-ink)">Paid on enrolment</b></div><div class="sumrow"><span>December</span><b>₦40,000 by 1 Dec</b></div><div class="sumrow"><span>January</span><b>₦40,000 by 1 Jan</b></div><p class="small muted">Read the <a href="/payment-policy">payment policy</a>.</p></aside>
</div></section>`};};
P.instalmentDone = () => { const p = sget("npa-last-instalment"); if (!p) return P.notFound();
  return { title:"Instalment received | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:720px"><div class="stack" style="gap:18px"><div class="ok-icon">${I.check("#0F7A3C",34)}</div><h1 style="font-size:clamp(30px,4vw,44px)">Thank you, ${esc(p.first)}.</h1><p class="lead">Your ${esc(p.month)} instalment of ₦40,000 has been received. A receipt is on its way to ${esc(p.email)}. Reference <b>${esc(p.ref)}</b>.</p><div class="row"><a class="btn deep" href="/onboarding">Back to onboarding</a><a class="btn ghost" href="/curriculum">View the curriculum</a></div></div></div></section>`};};
/* ---------- Blog ---------- */
function postCards(){ return `<div class="grid g3">${POSTS.map(p=>`<article class="card stack" style="gap:10px"><span class="small muted">${p.date}, ${p.mins}</span><h3><a href="/blog/${p.slug}" style="color:var(--ink);text-decoration:none">${p.title}</a></h3><p class="muted small">${p.intro}</p><a href="/blog/${p.slug}" style="font-weight:600;margin-top:auto">Read the article</a></article>`).join("")}</div>`; }
P.blog = () => ({ title:"Blog | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap stack" style="gap:14px"><h1>Blog</h1><p class="lead">Plain-English guides to digital marketing, careers and growth, written for African marketers.</p></div></section><section class="section"><div class="wrap stack" style="gap:40px">${postCards()}${eventBand()}</div></section>`});
P.post = (q, slug) => { const p = POSTS.find(x=>x.slug===slug); if (!p) return P.notFound(); const open = earlyOpen();
  const cta = `<aside class="inline-cta" aria-label="Free event"><span class="eyebrow" style="font-size:13.5px">Free live event, ${EVENT.dateLabel.replace(" 2026","")}</span><h2 style="font-size:24px;margin:0">Put this into practice: ${EVENT.title.toLowerCase().replace("creating","create")}</h2><p>One hour, live with our instructors. Leave with a one-page strategy and the template.</p><div><a class="btn" href="/events/first-marketing-strategy">Save my free seat</a></div></aside>`;
  const parts = p.body.split("<h2>"); const mid = Math.min(2, parts.length-1);
  const body = parts.map((s,i)=>(i?"<h2>":"")+s+(i===mid?cta:"")).join("");
  return { title:p.title + " | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap grid" style="grid-template-columns:minmax(0,1fr) 300px;gap:48px;align-items:start" id="post">
<article class="article stack" style="gap:18px"><a href="/blog" style="font-weight:600;text-decoration:none">Blog</a><span class="small muted">${p.date}, ${p.mins}</span><h1 style="font-size:clamp(30px,4vw,44px)">${p.title}</h1><p class="lead">${p.intro}</p>${body}
<div class="card stack" style="gap:10px;margin-top:16px"><h2 style="font-size:22px;margin:0">Learn it properly, with feedback</h2><p>Our Professional Digital Marketing Bootcamp covers strategy, content, social, SEO, paid media, email and analytics in eight practical modules.</p><div class="row"><a class="btn" href="/courses/digital-marketing">See the bootcamp</a><a class="btn ghost" href="/curriculum">See the curriculum</a></div></div></article>
<aside class="summary"><span class="pill green" style="align-self:flex-start">Next cohort enrolling</span><h2 style="font-size:20px">Learn it properly in 8 modules</h2><p class="small">Five certifications, live classes and a portfolio. ${open?"₦60,000 paid once until 10 October, or ₦40,000 a month.":"From ₦40,000 a month for three months."}</p><a class="btn deep block" href="/courses/digital-marketing">See the bootcamp</a></aside>
</div><style>@media (max-width:900px){#post{grid-template-columns:1fr!important}}</style></section>`};};

/* ---------- FAQ, contact, waitlist ---------- */
P.faq = () => ({ title:"FAQ | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap stack" style="gap:14px"><h1>Frequently asked questions</h1><p class="lead">About the bootcamp, paying from anywhere in Africa, and the free event.</p></div></section>
<section class="section"><div class="wrap stack" style="gap:40px;max-width:900px">${FAQS.map(g=>`<div class="stack" style="gap:12px"><h2 style="font-size:26px">${g[0]}</h2>${faqBlock(g[1],false)}</div>`).join("")}
<div class="band"><div class="stack" style="gap:6px"><h2 style="font-size:24px">Still have a question?</h2><p>Talk to an advisor on WhatsApp and get an answer the same day.</p></div><div class="stack" style="gap:10px"><a class="btn green" href="${wa("Hello, I have a question about Nerdy Pixels Academy.")}" target="_blank" rel="noopener">${I.wa()} Chat on WhatsApp</a><a class="btn ghost" href="/contact">Send us a message</a></div></div></div></section>`});
P.contact = (q) => ({ title:"Contact us | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap stack" style="gap:14px"><h1>Contact us</h1><p class="lead">Questions about courses, payments or your enrolment? We usually reply the same working day.</p></div></section>
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
  return { title:c.name + " waitlist | Nerdy Pixels Academy", html:`<section class="hero"><div class="wrap hero-grid" style="align-items:start"><div class="stack" style="gap:18px"><span class="pill" style="align-self:flex-start">${c.weeks}</span><h1>${c.name}</h1><p class="lead">${c.text}</p><p>Dates and pricing for the next intake are not announced yet. Join the waitlist and we'll tell you first, before enrolment opens to everyone.</p><p class="muted">Want to start now? The <a href="/courses/digital-marketing">Professional Digital Marketing Bootcamp</a> covers the foundations of every specialist programme.</p></div>
<form class="price-card" data-form="waitlist" data-course="${c.slug}" novalidate><h2 style="font-size:22px">Join the waitlist</h2><label class="f">Full name<input name="name" autocomplete="name"></label><label class="f">Email address<input type="email" name="email" autocomplete="email"></label><label class="f">Country<select name="country">${countryOptions("NG")}</select></label><button class="btn block" type="submit">Join the waitlist</button><p class="small muted">No spam. One email when enrolment opens.</p></form></div></section>`};};
P.waitlistDone = (q, slug) => { const c = COURSES.find(x=>x.slug===slug) || {name:"the programme"};
  return { title:"You're on the waitlist | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap" style="max-width:720px"><div class="stack" style="gap:18px"><div class="ok-icon">${I.check("#0F7A3C",34)}</div><h1 style="font-size:clamp(30px,4vw,44px)">You're on the ${esc(c.name)} waitlist.</h1><p class="lead">We'll email you as soon as dates and pricing are confirmed. In the meantime, the free event is a good place to start.</p><div class="row"><a class="btn" href="/events/first-marketing-strategy">Join the free event</a><a class="btn ghost" href="/courses">Back to courses</a></div></div></div></section>`};};

/* ---------- Policies ---------- */
const legal = (title, updated, sections) => ({ title:title + " | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap article stack" style="gap:18px"><h1 style="font-size:clamp(30px,4vw,44px)">${title}</h1><p class="muted">Last updated ${updated}</p>${sections.map(s=>`<h2>${s[0]}</h2>${s[1].map(p=>`<p>${p}</p>`).join("")}`).join("")}<p>Questions? Email <a href="mailto:${SITE.email}">${SITE.email}</a> or <a href="/contact">contact us</a>.</p></div></section>`});
P.terms = () => legal("Terms of enrolment","September 2026",[
 ["About these terms",["These terms apply when you enrol in the Professional Digital Marketing Bootcamp run by Nerdy Pixels Academy, a brand of Nerdy Pixels Digital. By completing checkout, you agree to them."]],
 ["Your place in the cohort",["Your seat is confirmed once your first payment is received. Seats are personal and cannot be transferred to someone else without our written agreement."]],
 ["Classes and attendance",["Live classes take place online from Thursday to Sunday, with self-paced work from Monday to Wednesday. Session times are confirmed at orientation. We may occasionally move a session, and we will give you notice when we do."]],
 ["Certifications",["The bootcamp prepares you for five industry certifications and includes our certificate of completion. Third-party certifications are issued by their providers under their own rules, and passing them depends on your own assessment results."]],
 ["Your work",["Portfolio work you create in the bootcamp belongs to you. Course materials, recordings and templates are for your personal learning and may not be shared or resold."]],
 ["Conduct",["We expect respectful behaviour in classes and community groups. We may remove anyone who harasses others, shares course materials publicly or disrupts learning."]],
 ["Changes",["If we need to change these terms, we will tell enrolled students by email before the change takes effect."]]
]);
P.payment = () => legal("Payment policy","September 2026",[
 ["Prices",["Early bird: ₦60,000, paid once, available from Monday 28 September to Saturday 10 October 2026.","Monthly plan: ₦40,000 a month for three months (November, December and January), ₦120,000 in total."]],
 ["Paying from outside Nigeria",["You can pay from other African countries and internationally. Prices are set in naira. If you pay in another currency, our payment partner shows the exact amount before you confirm, using its exchange rate on the day. Your bank or wallet provider may charge its own fees."]],
 ["Monthly plan instalments",["The November instalment is paid when you enrol. The December and January instalments are equal monthly payments of ₦40,000, payable on the 1st of every month. We send a payment link by WhatsApp and email three days before each due date.","If an instalment is more than seven days late, we may pause your access to live classes until it is paid. Talk to us early if you are having difficulty paying."]],
 ["Refunds",["If the bootcamp is not right for you, request a refund in writing within seven days of your first payment and before the end of the first week of classes. After that, payments are not refundable, but you may ask to move to a later cohort."]],
 ["Security",["Payments are processed by our licensed payment partner. We never see or store your full card details or wallet PIN."]]
]);
P.privacy = () => legal("Privacy policy","September 2026",[
 ["What we collect",["When you register for an event, enrol, join a waitlist or contact us, we collect the details you give us: your name, email address, WhatsApp number, country and your answers to our short questions. When you pay, our payment partner processes your payment details."]],
 ["How we use it",["We use your details to run your enrolment, send class information, receipts and reminders, answer your questions and improve our courses. With your consent, we send you marketing tips and event invitations, and you can unsubscribe at any time."]],
 ["Who we share it with",["We share only what is needed with service providers who help us run the academy, such as our payment partner and email and messaging tools. We do not sell your personal data."]],
 ["How long we keep it",["We keep student records for as long as needed to issue certificates and meet legal and accounting requirements. You can ask us to delete marketing data at any time."]],
 ["Your rights",["You can ask to see, correct or delete the personal data we hold about you, in line with the Nigeria Data Protection Act 2023 and other applicable laws. Email us to make a request."]]
]);
P.notFound = () => ({ title:"Page not found | Nerdy Pixels Academy", html:`<section class="section"><div class="wrap stack" style="gap:18px;max-width:720px"><h1>We couldn't find that page.</h1><p class="lead">The link may be out of date. These pages are a good place to start:</p><div class="row"><a class="btn" href="/courses/digital-marketing">Digital Marketing Bootcamp</a><a class="btn ghost" href="/">Home</a><a class="btn ghost" href="/contact">Contact us</a></div></div></section>`});
/* ============ Payment window (demo) ============
   On the live site, replace startPayment() with your payment partner's inline checkout
   (for example Flutterwave or Paystack), passing amount, currency, email, phone and reference.
   Call onSuccess(reference) from the partner's success callback. */
function startPayment(opts){
  const m = document.createElement("div"); m.className = "modal"; m.setAttribute("role","dialog"); m.setAttribute("aria-modal","true"); m.setAttribute("aria-labelledby","pay-t");
  m.innerHTML = `<div class="card stack" style="gap:16px"><div class="row" style="justify-content:space-between"><b id="pay-t" style="color:var(--ink);font-size:18px">Secure payment</b><span class="small muted row" style="gap:6px">${I.lock()} Encrypted</span></div>
<div class="sumrow"><span>${esc(opts.label)}</span><b style="color:var(--ink)">${naira(opts.amount)}</b></div>${opts.cur!=="NGN"?`<p class="small muted">Charged in ${esc(opts.curName)} (${opts.cur}) at our payment partner's rate.</p>`:""}
<div class="sumrow"><span>Method</span><b>${esc(opts.methodLabel)}</b></div>
<p class="small" style="background:var(--soft);padding:12px;border-radius:10px">${esc(opts.hint)}</p>
<button class="btn green block" type="button" data-pay="ok">${I.lock("#06301A")} Confirm payment</button><button class="btn ghost block" type="button" data-pay="cancel">Cancel</button>
<p class="small muted" style="text-align:center">Demo checkout: no money is taken.</p></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  m.addEventListener("click", e => {
    const b = e.target.closest("[data-pay]"); if (!b && e.target !== m) return;
    if (!b || b.dataset.pay === "cancel"){ close(); toast("Payment cancelled. Nothing was charged."); return; }
    b.disabled = true; b.textContent = "Processing…";
    setTimeout(() => { close(); opts.onSuccess("NPA-" + Math.floor(10000 + Math.random()*89999)); }, 900);
  });
  m.querySelector('[data-pay="ok"]').focus();
}
function toast(t){ const el = document.createElement("div"); el.className = "toast"; el.setAttribute("role","status"); el.textContent = t; document.body.appendChild(el); setTimeout(()=>el.remove(), 3200); }

/* ============ Router ============ */
const ROUTES = [
 [/^\/$/, P.home], [/^\/courses$/, P.courses], [/^\/courses\/digital-marketing$/, P.bootcamp], [/^\/curriculum$/, P.curriculum],
 [/^\/onboarding$/, P.onboarding], [/^\/events\/first-marketing-strategy$/, P.event], [/^\/events\/first-marketing-strategy\/registered$/, P.eventDone],
 [/^\/checkout$/, P.checkout], [/^\/checkout\/success$/, P.checkoutDone], [/^\/pay-instalment$/, P.instalment], [/^\/pay-instalment\/success$/, P.instalmentDone],
 [/^\/blog$/, P.blog], [/^\/blog\/([a-z0-9-]+)$/, P.post], [/^\/faq$/, P.faq], [/^\/contact$/, P.contact], [/^\/contact\/sent$/, P.contactDone],
 [/^\/waitlist\/([a-z0-9-]+)$/, P.waitlist], [/^\/waitlist\/([a-z0-9-]+)\/joined$/, P.waitlistDone],
 [/^\/terms$/, P.terms], [/^\/payment-policy$/, P.payment], [/^\/privacy$/, P.privacy]
];
let current = "";
function parseQS(qs){ const q = {}; (qs||"").replace(/^\?/,"").split("&").filter(Boolean).forEach(kv=>{ const [k,v] = kv.split("="); q[decodeURIComponent(k)] = decodeURIComponent((v||"").replace(/\+/g," ")); }); return q; }
function parse(){ return { path: location.pathname.replace(/\/+$/,"") || "/", q: parseQS(location.search) }; }
function go(h){ h = h.replace(/^/, ""); if (window.__npaNav) window.__npaNav(h); else location.href = h; }
function render(){
  const { path, q } = parse();
  if (q.preview === "open" || q.preview === "closed" || q.preview === "auto"){ try{ q.preview==="auto" ? sessionStorage.removeItem("npa-preview") : sessionStorage.setItem("npa-preview", q.preview); }catch(e){} }
  if (path === current && q.s){ scrollToId(q.s); return; }
  let page = null;
  for (const [re, fn] of ROUTES){ const m = path.match(re); if (m){ page = fn(q, m[1]); break; } }
  if (!page) page = P.notFound();
  current = path;
  document.title = page.title;
  document.getElementById("app").innerHTML = header(path) + `<main id="main" tabindex="-1">${page.html}</main>` + footer();
  if (page.mount) page.mount();
  if (/^\/courses\/digital-marketing$/.test(path)) document.getElementById("main").insertAdjacentHTML("beforeend", stickyEnrol());
  if (window.__npaTick) window.__npaTick();
  if (/^\/(checkout|pay-instalment)/.test(path)){ const f = document.querySelector(".wa-float"); if (f) f.remove(); }
  if (q.s) setTimeout(()=>scrollToId(q.s), 30); else window.scrollTo(0, 0);
  const h1 = document.querySelector("main h1"); if (h1 && !q.s) { document.getElementById("main").focus({preventScroll:true}); }
}
function scrollToId(id){ const el = document.getElementById(id); if (el) el.scrollIntoView({behavior:"smooth", block:"start"}); }

/* ============ Interactions ============ */
let booted = false;
export function boot(){
if (booted) return; booted = true;
const tick = () => document.querySelectorAll("[data-countdown]").forEach(el => { const ms = new Date(el.dataset.countdown) - Date.now(); if (ms <= 0){ el.textContent = ""; return; } const d = Math.floor(ms/864e5), h = Math.floor(ms%864e5/36e5), m = Math.floor(ms%36e5/6e4); el.textContent = `${d}d ${h}h ${m}m ${el.dataset.label}`; });
tick(); setInterval(tick, 30000); window.__npaTick = tick;
document.addEventListener("click", e => {
  const a = e.target.closest("[data-act]"); if (!a) return;
  const act = a.dataset.act, v = a.dataset.v;
  if (act === "menu"){ const d = document.getElementById("drawer"); const open = d.classList.toggle("open"); a.setAttribute("aria-expanded", String(open)); return; }
  const c = coState();
  if (act === "co-plan"){ if (v === "early" && !earlyOpen()) return; c.plan = v; coSave(c); coRender(); }
  if (act === "co-step"){ c.step = Number(v); coSave(c); coRender(); window.scrollTo({top:0,behavior:"smooth"}); }
  if (act === "co-method"){ c.method = v; coSave(c); coRender(); }
  if (act === "co-pay"){
    const ct = country(c.country), plan = coPlan(c), m = ct.methods.find(x=>x[0]===c.method) || ct.methods[0], amount = plan==="early"?PRICE_EARLY:PRICE_MONTH;
    const btn = a; btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = "Opening secure payment…";
    const order = { plan, amount, cur: ct.cur, country: ct.code, methodLabel: m[1], method: m[0], name: c.name, first: c.name.trim().split(" ")[0], email: c.email.trim(), phone: c.phone, persona: c.persona, source: c.source, referral: c.ref };
    save("orders", order);
    window.__npaPay({ kind:"enrolment", plan, name:c.name, email:c.email.trim(), phone:(ct.dial||"")+" "+(c.phone||""), country:ct.code, persona:c.persona, source:c.source, referral:c.ref, method:m[0] })
      .then(r => { sset("npa-pending-order", order); location.href = r.link; })
      .catch(err => { btn.disabled = false; btn.innerHTML = old; toast((err && err.message) || "We couldn't start the payment. Please try again."); });
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "co-country"){ const c = coState(); c.country = t.value; c.method = null; coSave(c); coRender(); }
  if (t.dataset && t.dataset.dialTarget){ const el = document.getElementById(t.dataset.dialTarget); if (el) el.textContent = country(t.value).dial; }
});
document.addEventListener("input", e => {
  const f = e.target.closest('form[data-form="co-details"]'); if (!f) return;
  const c = coState(); const t = e.target; c[t.name] = t.type === "checkbox" ? t.checked : t.value; coSave(c);
});
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form]"); if (!f) return; e.preventDefault();
  const d = Object.fromEntries(new FormData(f).entries()); const kind = f.dataset.form;
  const need = (cond, msg) => { if (!cond){ formError(f, msg); throw 0; } };
  try{
    if (kind === "newsletter"){ need(validEmail(d.email), "Enter a valid email address, for example ada@gmail.com."); save("subscribers", {email:d.email}); f.reset(); formError(f, ""); toast("You're subscribed. Look out for our next email."); return; }
    need((d.name||"").trim(), "Enter your full name.");
    need(validEmail(d.email), "Enter a valid email address, for example ada@gmail.com.");
    const first = d.name.trim().split(" ")[0];
    if (kind === "event"){ need(digits(d.phone).length >= 7, "Enter your WhatsApp number so we can send your joining link."); save("events", {...d, first}); if (window.__npaEvent) window.__npaEvent({...d}).catch(()=>{}); go("/events/first-marketing-strategy/registered"); }
    if (kind === "co-details"){ need(digits(d.phone).length >= 7, "Enter your WhatsApp number so we can add you to your cohort's group."); need(d.agree, "Tick the box to accept the terms and payment policy.");
      const c = coState(); Object.assign(c, d, {agree:true, step:3}); coSave(c); coRender(); window.scrollTo({top:0,behavior:"smooth"}); }
    if (kind === "contact"){ need((d.message||"").trim().length >= 5, "Write a short message so we know how to help."); save("messages", {...d, first}); go("/contact/sent"); }
    if (kind === "waitlist"){ save("waitlist", {...d, first, course:f.dataset.course}); go("/waitlist/" + f.dataset.course + "/joined"); }
    if (kind === "instalment"){ need(digits(d.phone).length >= 7, "Enter your WhatsApp number so we can send your receipt.");
      const ct = country(d.country); formError(f, "");
      const btn = f.querySelector('button[type="submit"]'); if (btn){ btn.disabled = true; btn.textContent = "Opening secure payment…"; }
      window.__npaPay({ kind:"instalment", month:d.month, name:d.name, email:d.email, phone:ct.dial+" "+d.phone, country:ct.code, referral:d.ref||"" })
        .then(r => { sset("npa-pending-instalment", {...d, first}); location.href = r.link; })
        .catch(err => { if (btn){ btn.disabled = false; btn.textContent = "Continue to pay ₦40,000"; } formError(f, (err && err.message) || "We couldn't start the payment. Please try again."); });
    }
  }catch(err){ if (err !== 0) throw err; }
});

document.addEventListener("click", e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest("a[href]"); if (!a || a.target || a.hasAttribute("download")) return;
  const href = a.getAttribute("href"); if (!href || !href.startsWith("/") || href.startsWith("//")) return;
  if (/^\/(admin|auth|api|student|reset-password|payment-return|sitemap|robots)/.test(href)) return;
  e.preventDefault(); go(href);
});
}
export function renderNow(){ render(); }
export function renderStatic(path, search){
  path = (path || "/").replace(/\/+$/,"") || "/"; const q = parseQS(search || "");
  let page = null;
  for (const [re, fn] of ROUTES){ const m = path.match(re); if (m){ try{ page = fn(q, m[1]); }catch(e){ page = null; } break; } }
  const found = !!page; if (!page) page = P.notFound();
  return { title: page.title, found, html: header(path) + `<main id="main" tabindex="-1">${page.html}</main>` + footer() };
}

