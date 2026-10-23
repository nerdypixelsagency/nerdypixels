// Server-only helpers: Flutterwave + Resend + enrollment records.
// Fallbacks only; live values come from the open cohort.
export const COHORT_START = "Saturday 14 November 2026";
export const PROFILE_FORM = "https://forms.gle/9Yt5Pa5kT5F19MYN8";
export const WHATSAPP_GROUP =
  "https://wa.me/2349136713644?text=" +
  encodeURIComponent("Hello, I've enrolled in the bootcamp. Please add me to my cohort's WhatsApp group.");
// Change once your domain is verified in Resend.
export const EMAIL_FROM = "Nerdy Pixels Academy <info@hello.npdacademy.com>";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type PayMode = "live" | "test";
export async function getPaymentMode(): Promise<PayMode> {
  const db = await admin();
  const { data } = await db.from("app_settings").select("value").eq("key", "payment_mode").maybeSingle();
  return data?.value === "test" ? "test" : "live";
}
export function flwKey(mode: PayMode) {
  const key = process.env[mode === "test" ? "FLW_TEST_SECRET_KEY" : "FLW_SECRET_KEY"];
  if (!key) throw new Error(mode === "test" ? "Test payments are not configured yet." : "Payments are not configured yet.");
  return key;
}

export async function flwCreatePayment(p: {
  mode: PayMode;
  txRef: string;
  amount: number;
  currency?: string;
  email: string;
  name: string;
  phone?: string | undefined;
  redirectUrl: string;
  title: string;
  meta: Record<string, string>;
}) {
  const key = flwKey(p.mode);
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: p.txRef,
      amount: p.amount,
      currency: p.currency ?? "NGN",
      redirect_url: p.redirectUrl,
      customer: { email: p.email, name: p.name, phonenumber: p.phone },
      meta: p.meta,
      customizations: { title: "Nerdy Pixels Academy", description: p.title },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: string; data?: { link?: string }; message?: string };
  if (!res.ok || body.status !== "success" || !body.data?.link) {
    console.error("Flutterwave create failed", res.status, body);
    throw new Error("We couldn't start the payment. Please try again.");
  }
  return body.data.link;
}

// The commission that applies to a referred sale, resolved at the moment the sale
// is confirmed paid. Snapshotting it here (rather than recomputing live) means a
// later rate change only affects future sales. NULL referral code = no commission.
export async function commissionSnapshot(
  db: Awaited<ReturnType<typeof admin>>,
  sale: { referral_code?: string | null; plan?: string | null; amount: number },
): Promise<{ commission_pct: number | null; commission_amount: number | null }> {
  const code = (sale.referral_code || "").trim().toUpperCase();
  if (!code) return { commission_pct: null, commission_amount: null };
  const [{ data: rates }, { data: amb }] = await Promise.all([
    db.from("app_settings").select("key, value").in("key", ["commission_outright_pct", "commission_instalment_pct"]),
    db.from("ambassadors").select("outright_pct, instalment_pct").eq("code", code).maybeSingle(),
  ]);
  const rm = Object.fromEntries((rates ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const isOutright = sale.plan === "early" || sale.plan === "deposit_early";
  const globalPct = isOutright ? Number(rm["commission_outright_pct"] ?? 10) : Number(rm["commission_instalment_pct"] ?? 10);
  const override = amb ? (isOutright ? amb.outright_pct : amb.instalment_pct) : null;
  const pct = override ?? globalPct;
  return { commission_pct: pct, commission_amount: Math.round((sale.amount * pct) / 100) };
}

// Verifies with Flutterwave and marks the record paid. Idempotent.
export async function confirmPayment(transactionId: string, txRef: string) {
  const db = await admin();
  const { data: row } = await db.from("enrolments").select("*").eq("tx_ref", txRef).maybeSingle();
  if (!row) return { ok: false as const, reason: "not_found" };
  if (row.status === "paid") return { ok: true as const, row };
  const key = flwKey((row as { mode?: string }).mode === "test" ? "test" : "live");

  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { status?: string; tx_ref?: string; amount?: number; currency?: string; payment_type?: string };
  };
  const d = body.data;
  // The currency and amount must match what we quoted when checkout started.
  const r = row as typeof row & { currency?: string | null; charge_amount?: number | string | null };
  const expectCur = r.currency || "NGN";
  const expectAmt = Number(r.charge_amount ?? row.amount);
  const good = d && d.status === "successful" && d.tx_ref === txRef && d.currency === expectCur && Number(d.amount) + 0.001 >= expectAmt;
  if (!good) {
    if (d?.status === "failed") await db.from("enrolments").update({ status: "failed" }).eq("id", row.id);
    return { ok: false as const, reason: d?.status ?? "unverified" };
  }
  // Lock in the commission for this sale at the rate in effect right now.
  const snap = await commissionSnapshot(db, { referral_code: row.referral_code, plan: row.plan, amount: row.amount });
  const { data: updated } = await db
    .from("enrolments")
    .update({ status: "paid", paid_at: new Date().toISOString(), flw_transaction_id: String(transactionId), payment_method: d.payment_type ?? row.payment_method, commission_pct: snap.commission_pct, commission_amount: snap.commission_amount })
    .eq("id", row.id)
    .neq("status", "paid")
    .select("*")
    .maybeSingle();
  if (updated) {
    // A monthly-deposit student who paid the early-bird balance moves to the early-bird plan.
    if (updated.kind === "instalment" && updated.instalment_month === "Balance" && updated.plan === "deposit_early") {
      await db.from("enrolments").update({ plan: "deposit_early" }).eq("email", updated.email).eq("kind", "enrolment").eq("status", "paid").eq("mode", updated.mode).eq("plan", "deposit_monthly");
    }
    const { autoEmailOn } = await import("./access.server");
    if (await autoEmailOn("payment_receipts")) await sendReceiptEmail(updated).catch((e) => console.error("Email failed", e));
    if (updated.mode !== "test") {
      const { ensureAmbassador } = await import("./email-log.server");
      await ensureAmbassador(updated.email, updated.name).catch((e) => console.error("Ambassador create failed", e));
    }
  }
  return { ok: true as const, row: updated ?? row };
}

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Row = { id: string; kind: string; name: string; email: string; plan: string | null; instalment_month: string | null; amount: number; tx_ref: string | null; currency?: string | null; charge_amount?: number | string | null; mode?: string };

export function formatMoney(n: number, code = "NGN", symbol?: string) {
  if (code === "NGN") return naira(Math.round(n));
  const v = Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return symbol ? `${symbol}${v}` : `${code} ${v}`;
}

export async function sendReceiptEmail(row: Row) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return;
  const { pricingFromCohort, scheduleFor, planLabel, longDate } = await import("./plans");
  const first = esc(row.name.trim().split(" ")[0]);
  // Pull the open cohort so the welcome email always carries current dates and WhatsApp link.
  let cohortStart = COHORT_START, whatsapp = WHATSAPP_GROUP;
  let pricing = pricingFromCohort(null);
  let symbol: string | undefined;
  const cur = row.currency || "NGN";
  try {
    const db = await admin();
    const { data: c } = await db.from("cohorts").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const co = c as { start_date?: string; whatsapp_link?: string } | null;
    if (co?.start_date) cohortStart = co.start_date;
    if (co?.whatsapp_link) whatsapp = co.whatsapp_link;
    pricing = pricingFromCohort(c as never);
    if (cur !== "NGN") {
      const { data: cr } = await db.from("currencies" as never).select("*").eq("code", cur).maybeSingle();
      const x = cr as { symbol: string; deposit: number; early_total: number; monthly: number } | null;
      if (x) { symbol = x.symbol; pricing = { ...pricing, deposit: Number(x.deposit), early: Number(x.early_total), monthly: Number(x.monthly) }; }
    }
  } catch { /* fall back to defaults */ }
  const money = (n: number) => formatMoney(n, cur, symbol);
  const isInst = row.kind === "instalment";
  const what = row.instalment_month === "Balance" ? "balance" : `${row.instalment_month} instalment`;
  const subject = isInst ? `Receipt: your ${what} has been received` : "Welcome to the Nerdy Pixels Academy bootcamp";
  // What is still to pay after this payment, with due dates.
  const items = scheduleFor(row.plan, pricing);
  const paidIdx = isInst ? items.findIndex((i) => i.key === row.instalment_month) : 0;
  const upcoming = items.slice(Math.max(1, paidIdx + 1));
  const dueList = upcoming.length
    ? `<p><b>Still to pay</b><br>${upcoming.map((i) => `${esc(i.label)}: <b>${money(i.amount)}</b>${i.due ? ` by ${esc(longDate(i.due))}` : ""}`).join("<br>")}<br><a href="https://bootcamp.npdacademy.com/pay-instalment">Pay your next instalment</a></p>`
    : "";
  const deposit = !isInst && (row.plan === "deposit_early" || row.plan === "deposit_monthly");
  const html = `<div style="font-family:Montserrat,Poppins,Arial,sans-serif;max-width:560px;margin:auto;color:#1A1128">
<div style="background:#2E0B63;color:#fff;padding:28px;border-radius:16px 16px 0 0"><h1 style="margin:0;font-size:24px">${isInst ? "Thank you" : deposit ? "Your seat is reserved" : "You're in"}, ${first}.</h1></div>
<div style="border:1px solid #E4DEEE;border-top:0;padding:28px;border-radius:0 0 16px 16px">
<p>We've received your payment of <b>${money(Number(row.charge_amount ?? row.amount))}</b>${isInst ? ` for your ${esc(what)}` : ""}.</p>
<p><b>Plan:</b> ${esc(planLabel(row.plan))}<br><b>Reference:</b> ${esc(row.tx_ref)}<br><b>Classes start:</b> ${esc(cohortStart)}</p>
${deposit ? `<p>Your deposit counts toward your fee and is fully refundable if you ask within 7 days of paying.</p>` : ""}
${dueList}
${isInst ? "" : `<p><b>Your next steps</b></p><ol>
<li><a href="${whatsapp}">Join your cohort's WhatsApp group</a></li>
<li><a href="${PROFILE_FORM}">Complete your student profile</a></li>
<li>Attend orientation. We'll share the link in the WhatsApp group.</li></ol>`}
<p>Questions? Reply to this email or write to info@hello.npdacademy.com.</p>
<p style="color:#574E68">Nerdy Pixels Academy</p></div></div>`;
  const { sendLogged } = await import("./email-log.server");
  const r = await sendLogged(row.email, subject, html, { type: isInst ? "payment_receipt" : "payment_welcome", relatedId: row.id });
  if (!r.ok) return;
  const db = await admin();
  await db.from("enrolments").update({ email_sent_at: new Date().toISOString() }).eq("id", row.id);
}
