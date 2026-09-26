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
  const fwd = url.hostname === "localhost" ? req.headers.get("x-forwarded-host") : null;
  return fwd ? `https://${fwd}` : url.origin;
}

export const startPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => startSchema.parse(d))
  .handler(async ({ data }) => {
    const { PRICE_EARLY, PRICE_MONTH, EARLY_END, flwCreatePayment } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plan = data.kind === "enrolment" ? (data.plan === "early" && Date.now() <= EARLY_END.getTime() ? "early" : "monthly") : "monthly";
    const amount = data.kind === "enrolment" && plan === "early" ? PRICE_EARLY : PRICE_MONTH;
    const txRef = "NPA-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const referral = data.referral ? data.referral.toUpperCase() : null;

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
    });
    if (error) {
      console.error("Insert enrolment failed", error);
      throw new Error("We couldn't start the payment. Please try again.");
    }
    const link = await flwCreatePayment({
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
