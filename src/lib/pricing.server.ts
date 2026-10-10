// Server-only: decides what a payment costs and in which currency it is charged.
// Naira prices come from the open cohort; other currencies use the fixed prices in `currencies`.
import { isEarlyPlan, pricingFromCohort, scheduleFor, type InstalmentKey, type PlanId, type Pricing } from "./plans";

export type CurrencyRow = { code: string; label: string; symbol: string; deposit: number; early_total: number; monthly: number; chargeable: boolean; active: boolean };
export type OpenCohort = {
  id: string; name?: string; deposit_amount?: number | null; early_bird_price?: number | null; instalment_amount?: number | null; instalment_count?: number | null;
  balance_due_date?: string | null; early_bird_enabled?: boolean; early_bird_deadline?: string | null; seat_limit?: number | null;
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function openCohort(): Promise<OpenCohort | null> {
  const { data } = await (await db()).from("cohorts").select("*").eq("status", "open").eq("is_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as OpenCohort | null) ?? null;
}

export async function currencyRows(): Promise<CurrencyRow[]> {
  const { data, error } = await (await db()).from("currencies" as never).select("*").eq("active", true);
  if (error) return []; // table not created yet: naira only
  return ((data ?? []) as CurrencyRow[]).map((r) => ({ ...r, deposit: Number(r.deposit), early_total: Number(r.early_total), monthly: Number(r.monthly) }));
}

/** The currency we can actually charge for a requested one: itself if enabled, else USD, else naira. */
export function chargeCurrency(requested: string | undefined, rows: CurrencyRow[]): CurrencyRow | null {
  const code = (requested ?? "NGN").toUpperCase();
  if (code === "NGN") return null;
  const want = rows.find((r) => r.code === code && r.chargeable);
  if (want) return want;
  return rows.find((r) => r.code === "USD" && r.chargeable) ?? null;
}

const pricingIn = (row: CurrencyRow, base: Pricing): Pricing => ({ deposit: row.deposit, early: row.early_total, monthly: row.monthly, count: base.count, balanceDue: base.balanceDue });

export async function earlySeatsTaken(cohortId: string) {
  const { data } = await (await db()).from("enrolments").select("email").eq("cohort_id", cohortId).eq("kind", "enrolment").eq("status", "paid").eq("mode", "live").in("plan", ["early", "deposit_early"]).limit(5000);
  return new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase())).size;
}

export function earlyClosedReason(c: OpenCohort | null, seatsTaken: number) {
  if (!c) return Date.now() > Date.parse("2026-10-31T22:59:59Z") ? "Early bird has closed." : null;
  if (!c.early_bird_enabled) return "Early bird is not available for this cohort.";
  if (!c.early_bird_deadline || Date.now() > Date.parse(c.early_bird_deadline)) return "Early bird has closed. Choose the monthly plan.";
  if (c.seat_limit != null && seatsTaken >= Number(c.seat_limit)) return "All early-bird seats are taken. Choose the monthly plan.";
  return null;
}

export type Quote = { amountNgn: number; charge: number; currency: string };

/** What to charge for a first payment (plan) or a later instalment (key), in the chosen currency. */
export function quote(cohort: OpenCohort | null, rows: CurrencyRow[], currency: string | undefined, plan: PlanId, key?: InstalmentKey): Quote {
  const base = pricingFromCohort(cohort);
  const row = chargeCurrency(currency, rows);
  const pick = (p: Pricing) => {
    const items = scheduleFor(plan, p);
    const item = key ? items.find((i) => i.key === key) : items[0];
    if (!item) throw new Error("That payment isn't part of your plan.");
    return item.amount;
  };
  const amountNgn = pick(base);
  if (!row) return { amountNgn, charge: amountNgn, currency: "NGN" };
  return { amountNgn, charge: Math.round(pick(pricingIn(row, base)) * 100) / 100, currency: row.code };
}

export { isEarlyPlan };
