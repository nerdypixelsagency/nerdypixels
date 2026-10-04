import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const startSchema = z.object({
  kind: z.enum(["enrolment", "instalment"]),
  plan: z.enum(["early", "monthly"]).optional(),
  month: z.enum(["December", "January"]).optional(),
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
    const { PRICE_EARLY, PRICE_MONTH, EARLY_END, flwCreatePayment, getPaymentMode } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cohort } = await supabaseAdmin.from("cohorts").select("id,early_bird_enabled,early_bird_price,early_bird_deadline,instalment_amount").eq("status", "open").eq("is_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const earlyAllowed = cohort ? cohort.early_bird_enabled && !!cohort.early_bird_deadline && Date.now() <= new Date(cohort.early_bird_deadline).getTime() : Date.now() <= EARLY_END.getTime();
    if (data.kind === "enrolment" && data.plan === "early" && !earlyAllowed) throw new Error("Early-bird enrolment is no longer available. Choose the monthly plan.");
    const plan = data.kind === "enrolment" ? (data.plan === "early" ? "early" : "monthly") : "monthly";
    const amount = data.kind === "enrolment" && plan === "early" ? (cohort?.early_bird_price ?? PRICE_EARLY) : (cohort?.instalment_amount ?? PRICE_MONTH);
    const txRef = "NPA-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const mode = await getPaymentMode();
    const referral = data.referral ? data.referral.toUpperCase() : null;
    // Tag the enrolment to the currently open cohort, if one exists.
    const { error } = await supabaseAdmin.from("enrolments").insert({
      kind: data.kind,
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone ?? null,
      country: data.country ?? null,
      persona: data.persona || null,
      source: data.source || null,
      referral_code: referral,
      plan,
      instalment_month: data.kind === "instalment" ? (data.month ?? null) : data.kind === "enrolment" && plan === "monthly" ? "November" : null,
      amount,
      payment_method: data.method ?? null,
      tx_ref: txRef,
      mode,
      cohort_id: cohort?.id ?? null,
    } as never);
    if (error) {
      console.error("[startPayment:db_insert]", error.code, error.message);
      throw new Error("We couldn't start the payment. Please try again.");
    }
    const link = await flwCreatePayment({
      mode,
      txRef,
      amount,
      email: data.email,
      name: data.name,
      phone: data.phone,
      redirectUrl: `${originOf()}/payment-return`,
      title: data.kind === "instalment" ? `${data.month} instalment` : plan === "early" ? "Bootcamp, early bird" : "Bootcamp, November instalment",
      meta: { kind: data.kind, plan, referral_code: referral ?? "", month: data.month ?? "" },
    });
    return { link, txRef, amount, plan };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ txRef: z.string().max(60), transactionId: z.string().max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { confirmPayment } = await import("./payments.server");
    const r = await confirmPayment(data.transactionId, data.txRef);
    if (!r.ok) return { ok: false as const, reason: r.reason };
    return { ok: true as const, kind: r.row.kind, plan: r.row.plan, amount: r.row.amount, month: r.row.instalment_month, ref: r.row.tx_ref };
  });

export const registerEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1).max(120), email: z.string().trim().email().max(200), phone: z.string().max(40).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("enrolments").insert({
      kind: "event",
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone ?? null,
      amount: 0,
      status: "registered",
    });
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
    const { error } = await supabaseAdmin.from("leads" as never).insert({
      first_name: data.firstName, last_name: data.lastName, email, phone: data.phone,
      country: data.country || null, source: data.source || null, mode: m?.value === "test" ? "test" : "live",
    } as never);
    if (error) { console.error("lead insert", error); throw new Error("Could not save your details."); }
    return { ok: true };
  });
