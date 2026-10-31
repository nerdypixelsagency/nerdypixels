// Server-only: validate a coupon and decide the discounted charge. The amount
// is NEVER taken from the browser; it is computed here from the coupon row.
import type { SupabaseClient } from "@supabase/supabase-js";
import { chargeCurrency, type CurrencyRow, type Quote } from "./pricing.server";

export type CouponRow = {
  id: string; code: string; label: string; badge: string;
  kind: "fixed" | "percent"; price_ngn: number | null; price_usd: number | null; percent: number | null;
  plan: string; active: boolean; starts_at: string | null; expires_at: string | null;
  max_uses: number | null; uses: number;
};

export type CouponCheck =
  | { ok: false; reason: "no_code" | "not_found" | "inactive" | "not_started" | "expired" | "maxed" | "currency_unavailable" | "unsupported" }
  | { ok: true; coupon: CouponRow; charge: number; amountNgn: number; currency: string; plan: string; label: string; badge: string };

/** Human message for a coupon failure (shown at checkout). */
export function couponMessage(reason: string): string {
  switch (reason) {
    case "expired": return "This discount link has expired.";
    case "maxed": return "This discount has reached its limit.";
    case "not_started": return "This discount isn't active yet.";
    case "inactive": return "This discount is no longer active.";
    case "currency_unavailable": return "This discount isn't available in your currency. Switch to Naira (₦) to use it.";
    case "not_found": return "That discount code wasn't found.";
    default: return "That discount can't be applied.";
  }
}

export async function validateCoupon(
  db: SupabaseClient,
  args: { code: string | null | undefined; currency: string | undefined; rows: CurrencyRow[]; baseQuote: Quote },
): Promise<CouponCheck> {
  const code = (args.code ?? "").trim();
  if (!code) return { ok: false, reason: "no_code" };
  const { data } = await db.from("coupons").select("*").ilike("code", code).maybeSingle();
  const c = data as CouponRow | null;
  if (!c) return { ok: false, reason: "not_found" };
  if (!c.active) return { ok: false, reason: "inactive" };
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { ok: false, reason: "not_started" };
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return { ok: false, reason: "expired" };
  if (c.max_uses != null && c.uses >= c.max_uses) return { ok: false, reason: "maxed" };

  const row = chargeCurrency(args.currency, args.rows);
  const cur = row?.code ?? "NGN";
  let charge: number | null;
  let amountNgn: number;
  if (c.kind === "fixed") {
    charge = cur === "NGN" ? (c.price_ngn ?? null) : cur === "USD" ? (c.price_usd ?? null) : null;
    amountNgn = c.price_ngn ?? args.baseQuote.amountNgn;
  } else {
    const f = Math.max(0, 1 - Number(c.percent ?? 0) / 100);
    charge = Math.round(args.baseQuote.charge * f * 100) / 100;
    amountNgn = Math.round(args.baseQuote.amountNgn * f);
  }
  if (charge == null || charge <= 0) return { ok: false, reason: "currency_unavailable" };
  return { ok: true, coupon: c, charge, amountNgn, currency: cur, plan: c.plan || "early", label: c.label, badge: c.badge };
}
