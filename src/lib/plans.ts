// Payment plans and schedules, shared by checkout, reminders, the student area and admin.
// Legacy plans ("early", "monthly") stay valid for students who enrolled before deposits.

export const PLAN_IDS = ["early", "monthly", "deposit_early", "deposit_monthly"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export const INSTALMENT_KEYS = ["Balance", "December", "January"] as const;
export type InstalmentKey = (typeof INSTALMENT_KEYS)[number];

export const MONTH_DUE: Record<"December" | "January", string> = { December: "2026-12-01", January: "2027-01-01" };

export type Pricing = { deposit: number; early: number; monthly: number; count: number; balanceDue: string | null };
export type ScheduleItem = { key: "Full" | "Deposit" | "November" | InstalmentKey; label: string; amount: number; due: string | null };

export const isPlan = (p: unknown): p is PlanId => PLAN_IDS.includes(p as PlanId);
export const isEarlyPlan = (p: string | null | undefined) => p === "early" || p === "deposit_early";
export const isDepositPlan = (p: string | null | undefined) => p === "deposit_early" || p === "deposit_monthly";
/** Plans that still owe something after the first payment. */
export const hasInstalments = (p: string | null | undefined) => p === "monthly" || isDepositPlan(p);

export function pricingFromCohort(c: { deposit_amount?: number | null; early_bird_price?: number | null; instalment_amount?: number | null; instalment_count?: number | null; balance_due_date?: string | null } | null | undefined): Pricing {
  return {
    deposit: Number(c?.deposit_amount ?? 0),
    early: Number(c?.early_bird_price ?? 60000),
    monthly: Number(c?.instalment_amount ?? 40000),
    count: Number(c?.instalment_count ?? 3),
    balanceDue: c?.balance_due_date ?? null,
  };
}

const month = (m: "December" | "January", p: Pricing): ScheduleItem => ({ key: m, label: `${m} instalment`, amount: p.monthly, due: MONTH_DUE[m] });

export function scheduleFor(plan: string | null | undefined, p: Pricing): ScheduleItem[] {
  switch (plan) {
    case "early":
      return [{ key: "Full", label: "Early bird, paid in full", amount: p.early, due: null }];
    case "deposit_early":
      return [
        { key: "Deposit", label: "Seat deposit", amount: p.deposit, due: null },
        { key: "Balance", label: "Early-bird balance", amount: Math.max(0, p.early - p.deposit), due: p.balanceDue },
      ];
    case "deposit_monthly":
      return [
        { key: "Deposit", label: "Seat deposit", amount: p.deposit, due: null },
        { key: "Balance", label: "Rest of the first month", amount: Math.max(0, p.monthly - p.deposit), due: p.balanceDue },
        month("December", p),
        month("January", p),
      ];
    default:
      return [{ key: "November", label: "First month", amount: p.monthly, due: null }, month("December", p), month("January", p)];
  }
}

export const firstPayment = (plan: PlanId, p: Pricing) => scheduleFor(plan, p)[0]!.amount;
export const instalmentAmount = (plan: string | null | undefined, key: InstalmentKey, p: Pricing) => scheduleFor(plan, p).find((i) => i.key === key)?.amount ?? null;
export const planTotal = (plan: string | null | undefined, p: Pricing) => scheduleFor(plan, p).reduce((s, i) => s + i.amount, 0);

/** Items after the first payment that have not been paid yet. */
export function unpaidItems(plan: string | null | undefined, paid: Set<string>, p: Pricing) {
  return scheduleFor(plan, p).slice(1).filter((i) => !paid.has(i.key));
}

export function planLabel(plan: string | null | undefined) {
  switch (plan) {
    case "early": return "Early bird, paid in full";
    case "deposit_early": return "Early bird with deposit";
    case "deposit_monthly": return "Monthly plan with deposit";
    case "monthly": return "Monthly plan";
    default: return plan ?? "—";
  }
}

/** Readable date, e.g. "Saturday 7 November 2026". */
export function longDate(iso: string | null | undefined, weekday = true) {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { ...(weekday ? { weekday: "long" } : {}), day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}
