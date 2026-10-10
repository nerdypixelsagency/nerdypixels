// Admin page access. The super admin gives each admin a preset or a custom set of pages.
// An admin with no permissions set (null) has full admin access, as before.

export const PERMS = [
  ["dashboard", "Dashboard & statistics"],
  ["enrolments", "Enrolments & students"],
  ["leads", "Leads & form submissions"],
  ["emails", "Email centre"],
  ["referrals", "Referrals & ambassadors"],
  ["instalments", "Instalments & reminders"],
  ["commissions", "Commissions & payouts"],
  ["cohorts", "Courses & cohorts"],
  ["currencies", "Currencies & prices"],
  ["content", "Site content builder"],
  ["media", "Media & syllabus"],
  ["preview", "View as student"],
] as const;
export type Perm = (typeof PERMS)[number][0];

export const PRESETS: Record<string, { label: string; perms: Perm[] | null; help: string }> = {
  full: { label: "Full admin", perms: null, help: "Every page except Admins and Settings." },
  editor: { label: "Content editor", perms: ["content", "media"], help: "Edits the website, testimonials, media and syllabus." },
  finance: { label: "Finance", perms: ["dashboard", "enrolments", "instalments", "commissions", "currencies"], help: "Payments, instalments, commissions and prices." },
  support: { label: "Student support", perms: ["enrolments", "leads", "emails", "instalments", "preview"], help: "Answers students and leads, sends emails and reminders." },
  marketing: { label: "Marketing", perms: ["dashboard", "leads", "emails", "referrals", "content", "media"], help: "Leads, email campaigns, ambassadors and site content." },
  viewer: { label: "Viewer", perms: ["dashboard"], help: "Sees the dashboard statistics only." },
};

export type Access = { role: "super_admin" | "admin" | null; permissions: string[] | null; preset: string | null };

export function can(a: Access | null | undefined, perm: Perm | "team" | "settings") {
  if (!a?.role) return false;
  if (a.role === "super_admin") return true;
  if (perm === "team" || perm === "settings") return false;
  return a.permissions == null || a.permissions.includes(perm);
}

type Ctx = { supabase: any; userId: string };

/** The signed-in user's admin access, read with their own session (safe on client or server). */
export async function accessOf(ctx: Ctx): Promise<Access> {
  await ctx.supabase.rpc("claim_super_admin");
  const { data, error } = await ctx.supabase.from("user_roles").select("*").eq("user_id", ctx.userId);
  if (error) throw new Error(`Could not load admin access: ${error.message}`);
  const rows = (data ?? []) as { role: string; permissions?: string[] | null; preset?: string | null }[];
  if (rows.some((r) => r.role === "super_admin")) return { role: "super_admin", permissions: null, preset: null };
  const a = rows.find((r) => r.role === "admin");
  return a ? { role: "admin", permissions: a.permissions ?? null, preset: a.preset ?? null } : { role: null, permissions: null, preset: null };
}

/** Throws unless the signed-in admin may use at least one of these pages. */
export async function requirePerm(ctx: Ctx, ...perms: Perm[]) {
  const a = await accessOf(ctx);
  if (!a.role || !perms.some((p) => can(a, p))) throw new Error("You don't have access to this page. Ask the super admin.");
  return a;
}

export async function requireSuper(ctx: Ctx) {
  const a = await accessOf(ctx);
  if (a.role !== "super_admin") throw new Error("Only the super admin can do this.");
  return a;
}

export const AUTO_EMAILS = [
  ["payment_receipts", "Payment receipts and welcome emails", "Sent when a payment is confirmed. Keep this on unless you send receipts another way."],
  ["reminders", "Instalment reminders", "5 days before, 1 day before, on the due date and 3 days after, until paid."],
  ["daily_summary", "Daily statistics email", "Sign-ups, payments and what's due, every morning at 8:00 WAT."],
  ["form_confirmations", "Form confirmations", "\"We've received your details\" emails after the lead and free class forms."],
  ["ambassador_emails", "Ambassador code emails", "Sent automatically when a new ambassador is created."],
] as const;
export type AutoEmailKey = (typeof AUTO_EMAILS)[number][0];
