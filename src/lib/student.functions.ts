import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://bootcamp.npdacademy.com";

// Emails a one-time sign-in link via Resend. Only emails that have an enrolment get a link;
// the response is the same either way so nobody can probe who is enrolled.
export const requestStudentLink = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("enrolments").select("id").eq("email", email).neq("kind", "event").limit(1);
    if (!rows?.length) return { ok: true };
    const redirectTo = `${SITE}/student`;
    let res = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
    if (res.error) {
      await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
      res = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
    }
    if (res.error || !res.data) {
      console.error("student link failed", res.error?.message);
      return { ok: false, error: "We couldn't create your sign-in link. Please try again in a minute." };
    }
    const p = res.data.properties;
    const link = `${process.env["SUPABASE_URL"]}/auth/v1/verify?token=${p.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(redirectTo)}`;
    const { renderAuthEmail, sendViaResend } = await import("./auth-emails.server");
    const { subject, html } = renderAuthEmail("magiclink", link, p.email_otp);
    for (let i = 0; i < 3; i++) {
      try { await sendViaResend(email, subject, html); return { ok: true }; }
      catch (e) { console.error("resend", e); await new Promise((r) => setTimeout(r, 400 * 2 ** i)); }
    }
    return { ok: false, error: "We couldn't send the email. Please try again in a minute." };
  });

// A student's own records, matched on the verified email of the signed-in account.
export const getMyStudentRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: u } = await context.supabase.auth.getUser();
    const email = u.user?.email?.toLowerCase();
    if (!email || !u.user?.email_confirmed_at) throw new Error("Please use the sign-in link from your email.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("enrolments")
      .select("id, kind, name, plan, instalment_month, amount, status, paid_at, created_at, tx_ref, mode")
      .eq("email", email)
      .eq("mode", "live")
      .order("created_at");
    const list = (rows ?? []) as Array<{ kind: string; plan: string | null; instalment_month: string | null; status: string; name: string }>;
    const monthly = list.some((r) => r.kind === "enrolment" && r.plan === "monthly" && r.status === "paid");
    const paidMonths = new Set(list.filter((r) => r.kind === "instalment" && r.status === "paid").map((r) => r.instalment_month));
    const due = monthly ? ["December", "January"].filter((m) => !paidMonths.has(m)) : [];
    return { email, name: list[0]?.name ?? "", rows: rows ?? [], nextDue: due[0] ?? null, dueDates: { December: "1 December 2026", January: "1 January 2027" } };
  });
