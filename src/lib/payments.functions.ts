import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { INSTALMENT_KEYS, PLAN_IDS, isDepositPlan, isEarlyPlan, isPlan, pricingFromCohort, scheduleFor, type InstalmentKey, type PlanId } from "./plans";

const startSchema = z.object({
  kind: z.enum(["enrolment", "instalment"]),
  plan: z.enum(PLAN_IDS).optional(),
  month: z.enum(INSTALMENT_KEYS).optional(),
  // Deposit-monthly students paying their balance can move to the early-bird price while it is open.
  switchTo: z.enum(["early"]).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  country: z.string().max(4).optional(),
  persona: z.string().max(40).optional(),
  source: z.string().max(40).optional(),
  referral: z.string().trim().max(40).optional(),
  method: z.string().max(20).optional(),
});

function originOf() {
  const req = getRequest();
  const url = new URL(req.url);
  const relayed = req.headers.get("x-npa-origin");
  if (relayed && /^https:\/\/([a-z0-9-]+\.)*npdacademy\.com$/.test(relayed)) return relayed;
  const fwd = url.hostname === "localhost" ? req.headers.get("x-forwarded-host") : null;
  return fwd ? `https://${fwd}` : url.origin;
}

export const startPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => startSchema.parse(d))
  .handler(async ({ data }) => {
    const { flwCreatePayment, getPaymentMode } = await import("./payments.server");
    const { openCohort, currencyRows, quote, earlySeatsTaken, earlyClosedReason } = await import("./pricing.server");
    const { countryFromHeaders } = await import("./geo.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [cohort, rows, mode] = await Promise.all([openCohort(), currencyRows(), getPaymentMode()]);
    const email = data.email.toLowerCase();
    const deposits = Number(cohort?.deposit_amount ?? 0) > 0;
    const earlyClosed = async () => earlyClosedReason(cohort, cohort ? await earlySeatsTaken(cohort.id) : 0);

    let plan: PlanId;
    let key: InstalmentKey | undefined;
    let cohortId = cohort?.id ?? null;
    let referral = data.referral ? data.referral.toUpperCase() : null;
    if (data.kind === "enrolment") {
      plan = data.plan ?? (deposits ? "deposit_monthly" : "monthly");
      if (isDepositPlan(plan) && !deposits) plan = plan === "deposit_early" ? "early" : "monthly";
      if (isEarlyPlan(plan)) { const why = await earlyClosed(); if (why) throw new Error(why); }
    } else {
      key = data.month;
      if (!key) throw new Error("Choose which payment you are making.");
      // The amount depends on the plan the student actually enrolled on.
      const { data: enr } = await supabaseAdmin.from("enrolments").select("plan, cohort_id, referral_code").eq("email", email).eq("kind", "enrolment").eq("status", "paid").eq("mode", mode).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const enrolled = enr as { plan: string | null; cohort_id: string | null; referral_code: string | null } | null;
      if (!enrolled && key === "Balance") throw new Error("We couldn't find a paid deposit for this email. Use the email you enrolled with, or message us on WhatsApp.");
      plan = isPlan(enrolled?.plan) ? enrolled!.plan : "monthly";
      if (enrolled?.cohort_id) cohortId = enrolled.cohort_id;
      referral = enrolled?.referral_code ?? null;
      if (key === "Balance" && plan === "deposit_monthly" && data.switchTo === "early") {
        const why = await earlyClosed(); if (why) throw new Error(why);
        plan = "deposit_early";
      }
      const { data: dup } = await supabaseAdmin.from("enrolments").select("id").eq("email", email).eq("kind", "instalment").eq("instalment_month", key).eq("status", "paid").eq("mode", mode).limit(1);
      if (dup?.length) throw new Error(key === "Balance" ? "Your balance is already paid." : `Your ${key} instalment is already paid.`);
      if (!scheduleFor(plan, pricingFromCohort(cohort)).some((i) => i.key === key))
        throw new Error(isEarlyPlan(plan) ? "You're on the early-bird plan, so you only have the balance left to pay." : "That payment isn't part of your plan.");
    }
    const q = quote(cohort, rows, data.currency, plan, key);
    if (q.charge <= 0) throw new Error("There is nothing to pay for this item.");
    const txRef = "NPA-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const geo = countryFromHeaders(getRequest().headers);
    const { error } = await supabaseAdmin.from("enrolments").insert({
      kind: data.kind,
      name: data.name,
      email,
      phone: data.phone ?? null,
      country: data.country ?? null,
      geo_country: geo,
      persona: data.persona || null,
      source: data.source || null,
      referral_code: referral,
      plan,
      instalment_month: key ?? (plan === "monthly" ? "November" : null),
      amount: q.amountNgn,
      charge_amount: q.charge,
      currency: q.currency,
      payment_method: data.method ?? null,
      tx_ref: txRef,
      mode,
      cohort_id: cohortId,
    } as never);
    if (error) {
      console.error("[startPayment:db_insert]", error.code, error.message);
      throw new Error("We couldn't start the payment. Please try again.");
    }
    const title = key ? (key === "Balance" ? "Bootcamp balance" : `${key} instalment`) : isDepositPlan(plan) ? "Bootcamp seat deposit" : plan === "early" ? "Bootcamp, early bird" : "Bootcamp, first month";
    const link = await flwCreatePayment({
      mode,
      txRef,
      amount: q.charge,
      currency: q.currency,
      email: data.email,
      name: data.name,
      phone: data.phone,
      redirectUrl: `${originOf()}/payment-return`,
      title,
      meta: { kind: data.kind, plan, referral_code: referral ?? "", month: key ?? "" },
    });
    return { link, txRef, amount: q.amountNgn, charge: q.charge, currency: q.currency, plan };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ txRef: z.string().max(60), transactionId: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { confirmPayment } = await import("./payments.server");
    const r = await confirmPayment(data.transactionId, data.txRef);
    if (!r.ok) return { ok: false as const, reason: r.reason };
    const row = r.row as typeof r.row & { currency?: string | null; charge_amount?: number | string | null };
    return { ok: true as const, kind: row.kind, plan: row.plan, amount: row.amount, month: row.instalment_month, ref: row.tx_ref, currency: row.currency ?? "NGN", charge: Number(row.charge_amount ?? row.amount) };
  });

// The visitor's country from the edge, for showing prices in their currency.
export const getVisitorGeo = createServerFn({ method: "GET" }).handler(async () => {
  const { countryFromHeaders } = await import("./geo.server");
  return { country: countryFromHeaders(getRequest().headers) };
});

export const requestSyllabus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      firstName: z.string().trim().min(1).max(60),
      email: z.string().trim().email().max(200),
      phone: z.string().trim().max(40).optional().default(""),
      website: z.string().max(200).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true }; // honeypot
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { countryFromHeaders } = await import("./geo.server");
    const email = data.email.toLowerCase();
    const { data: file } = await supabaseAdmin.from("syllabi" as never).select("title, file_url").eq("active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const syl = file as { title: string; file_url: string } | null;
    if (!syl) throw new Error("The syllabus isn't available right now. Please message us on WhatsApp.");
    const { data: m } = await supabaseAdmin.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
    const mode = m?.value === "test" ? "test" : "live";
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin.from("leads" as never).select("id").eq("email", email).eq("category", "syllabus").gte("created_at", since).limit(1);
    let leadId: string | undefined;
    if (!(recent as unknown[] | null)?.length) {
      const { data: ins } = await supabaseAdmin.from("leads" as never).insert({
        first_name: data.firstName, last_name: "-", email, phone: data.phone || "-",
        country: countryFromHeaders(getRequest().headers), source: "Syllabus download", mode, category: "syllabus",
      } as never).select("id").maybeSingle();
      leadId = (ins as { id?: string } | null)?.id;
    }
    const { syllabusEmail, sendLogged } = await import("./email-log.server");
    const c = syllabusEmail(data.firstName, syl.title, syl.file_url);
    const r = await sendLogged(email, c.subject, c.html, { type: "syllabus", relatedId: leadId, mode });
    if (!r.ok) throw new Error("We couldn't email the syllabus. Please check the address and try again.");
    return { ok: true };
  });

export const registerEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(200),
      phone: z.string().max(40).optional(),
      persona: z.string().max(40).optional(),
      country: z.string().max(60).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { countryFromHeaders } = await import("./geo.server");
    const email = data.email.toLowerCase();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin.from("enrolments").select("id").eq("email", email).eq("kind", "event").gte("created_at", since).limit(1);
    if (recent?.length) return { ok: true };
    const { data: m } = await supabaseAdmin.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
    const mode = m?.value === "test" ? "test" : "live";
    const geo = countryFromHeaders(getRequest().headers);
    const country = data.country || geo;
    await supabaseAdmin.from("enrolments").insert({ kind: "event", name: data.name, email, phone: data.phone ?? null, persona: data.persona || null, country, geo_country: geo, amount: 0, status: "registered", mode } as never);
    const [first, ...rest] = data.name.trim().split(/\s+/);
    await supabaseAdmin.from("leads").insert({ first_name: first || data.name, last_name: rest.join(" ") || "-", email, phone: data.phone || "-", country, category: "free_event", source: "Free class", mode } as never);
    const { formConfirmation, sendLogged } = await import("./email-log.server");
    const c = formConfirmation(first || "there", "free class registration");
    const { autoEmailOn } = await import("./access.server");
    if (await autoEmailOn("form_confirmations")) await sendLogged(email, c.subject, c.html, { type: "form_confirmation", mode });
    return { ok: true };
  });

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        firstName: z.string().trim().min(1).max(60),
        lastName: z.string().trim().min(1).max(60),
        email: z.string().trim().email().max(200),
        phone: z.string().trim().min(7).max(40),
        country: z.string().trim().max(60).optional().default(""),
        source: z.string().trim().max(60).optional().default(""),
        website: z.string().max(200).optional().default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true }; // honeypot
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin.from("leads" as never).select("id").eq("email", email).gte("created_at", since).limit(1);
    if (recent && (recent as unknown[]).length) return { ok: true };
    const { data: m } = await supabaseAdmin.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
    const mode = m?.value === "test" ? "test" : "live";
    const { data: ins, error } = await supabaseAdmin.from("leads" as never).insert({
      first_name: data.firstName, last_name: data.lastName, email, phone: data.phone,
      country: data.country || null, source: data.source || null, mode, category: "hero_lead",
    } as never).select("id").maybeSingle();
    if (error) { console.error("lead insert", error); throw new Error("Could not save your details."); }
    const { formConfirmation, sendLogged } = await import("./email-log.server");
    const c = formConfirmation(data.firstName, "details");
    const { autoEmailOn } = await import("./access.server");
    if (await autoEmailOn("form_confirmations")) await sendLogged(email, c.subject, c.html, { type: "form_confirmation", relatedId: (ins as { id?: string } | null)?.id, mode });
    return { ok: true };
  });
