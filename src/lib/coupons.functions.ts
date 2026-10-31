import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePerm } from "./access";

export type CouponAdminRow = {
  id: string; code: string; label: string; badge: string; kind: "fixed" | "percent";
  price_ngn: number | null; price_usd: number | null; percent: number | null; plan: string;
  active: boolean; starts_at: string | null; expires_at: string | null; max_uses: number | null;
  uses: number; created_at: string;
};

/** PUBLIC: the discounted price + validity for a coupon, used to show the deal and
 *  countdown at checkout. The real charge is re-validated server-side at payment time. */
export const getCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().max(40), currency: z.string().regex(/^[A-Z]{3}$/).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { openCohort, currencyRows, quote } = await import("./pricing.server");
    const { validateCoupon } = await import("./coupons.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { pricingFromCohort } = await import("./plans");
    const [cohort, rows] = await Promise.all([openCohort(), currencyRows()]);
    const base = quote(cohort, rows, data.currency, "early");
    const v = await validateCoupon(supabaseAdmin, { code: data.code, currency: data.currency, rows, baseQuote: base });
    if (!v.ok) return { valid: false as const, reason: v.reason };
    // The strike-through "was" price is the full monthly total (what they save against).
    const pr = pricingFromCohort(cohort);
    const monthlyQ = quote(cohort, rows, data.currency, "monthly");
    const listNgn = pr.monthly * pr.count;
    const listCharge = Math.round(monthlyQ.charge * pr.count * 100) / 100;
    return {
      valid: true as const, code: data.code.toUpperCase(), label: v.label, badge: v.badge,
      charge: v.charge, amountNgn: v.amountNgn, currency: v.currency,
      baseCharge: listCharge, baseNgn: listNgn, baseCurrency: v.currency,
      expiresAt: v.coupon.expires_at, plan: v.plan,
    };
  });

/** Admin: every coupon, newest first. */
export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePerm(context, "coupons");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false }).limit(1000);
    return { rows: (data ?? []) as CouponAdminRow[] };
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, - and _ only"),
  label: z.string().trim().max(80).optional(),
  badge: z.string().trim().max(40).optional(),
  kind: z.enum(["fixed", "percent"]),
  priceNgn: z.number().int().min(0).nullable().optional(),
  priceUsd: z.number().min(0).nullable().optional(),
  percent: z.number().min(0).max(100).nullable().optional(),
  active: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
});

/** Admin: create or update a coupon. */
export const saveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "coupons");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      code: data.code.toUpperCase(),
      label: data.label ?? "",
      badge: data.badge ?? "",
      kind: data.kind,
      price_ngn: data.kind === "fixed" ? (data.priceNgn ?? null) : null,
      price_usd: data.kind === "fixed" ? (data.priceUsd ?? null) : null,
      percent: data.kind === "percent" ? (data.percent ?? null) : null,
      plan: "early",
      active: data.active ?? true,
      starts_at: data.startsAt || null,
      expires_at: data.expiresAt || null,
      max_uses: data.maxUses ?? null,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("coupons").update(row as never).eq("id", data.id);
      if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "That code is already used by another coupon." : error.message);
      return { ok: true as const, id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin.from("coupons").insert({ ...row, created_by: context.userId } as never).select("id").single();
    if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "That code is already in use." : error.message);
    return { ok: true as const, id: (ins as { id: string }).id };
  });

/** Admin: delete a coupon. */
export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePerm(context, "coupons");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
