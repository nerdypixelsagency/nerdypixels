// Server-only helpers: Flutterwave + Resend + enrolment records.
export const PRICE_EARLY = 60000;
export const PRICE_MONTH = 40000;
export const EARLY_END = new Date("2026-10-10T23:59:59+01:00");
export const COHORT_START = "Thursday 5 November 2026";
export const PROFILE_FORM = "https://forms.gle/9Yt5Pa5kT5F19MYN8";
export const WHATSAPP_GROUP =
  "https://wa.me/2349136713644?text=" +
  encodeURIComponent("Hello, I've enrolled in the bootcamp. Please add me to my cohort's WhatsApp group.");
// Change once your domain is verified in Resend.
export const EMAIL_FROM = "Nerdy Pixels Academy <onboarding@resend.dev>";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function flwCreatePayment(p: {
  txRef: string;
  amount: number;
  email: string;
  name: string;
  phone?: string;
  redirectUrl: string;
  title: string;
  meta: Record<string, string>;
}) {
  const key = process.env["FLW_SECRET_KEY"];
  if (!key) throw new Error("Payments are not configured yet.");
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: p.txRef,
      amount: p.amount,
      currency: "NGN",
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

// Verifies with Flutterwave and marks the record paid. Idempotent.
export async function confirmPayment(transactionId: string, txRef: string) {
  const key = process.env["FLW_SECRET_KEY"];
  if (!key) throw new Error("Payments are not configured yet.");
  const db = await admin();
  const { data: row } = await db.from("enrolments").select("*").eq("tx_ref", txRef).maybeSingle();
  if (!row) return { ok: false as const, reason: "not_found" };
  if (row.status === "paid") return { ok: true as const, row };

  const res = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { status?: string; tx_ref?: string; amount?: number; currency?: string; payment_type?: string };
  };
  const d = body.data;
  const good = d && d.status === "successful" && d.tx_ref === txRef && d.currency === "NGN" && Number(d.amount) >= row.amount;
  if (!good) {
    if (d?.status === "failed") await db.from("enrolments").update({ status: "failed" }).eq("id", row.id);
    return { ok: false as const, reason: d?.status ?? "unverified" };
  }
  const { data: updated } = await db
    .from("enrolments")
    .update({ status: "paid", paid_at: new Date().toISOString(), flw_transaction_id: String(transactionId), payment_method: d.payment_type ?? row.payment_method })
    .eq("id", row.id)
    .neq("status", "paid")
    .select("*")
    .maybeSingle();
  if (updated) await sendReceiptEmail(updated).catch((e) => console.error("Email failed", e));
  return { ok: true as const, row: updated ?? row };
}

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Row = { id: string; kind: string; name: string; email: string; plan: string | null; instalment_month: string | null; amount: number; tx_ref: string | null };

export async function sendReceiptEmail(row: Row) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return;
  const first = esc(row.name.trim().split(" ")[0]);
  const isInst = row.kind === "instalment";
  const subject = isInst ? `Receipt: ${row.instalment_month} instalment received` : "Welcome to the Nerdy Pixels Academy bootcamp";
  const planLine = isInst
    ? `${esc(row.instalment_month)} instalment`
    : row.plan === "early"
      ? "Early bird, paid in full"
      : "Monthly plan (₦40,000 on the 1st of December and January)";
  const html = `<div style="font-family:Poppins,Arial,sans-serif;max-width:560px;margin:auto;color:#1A1128">
<div style="background:#2E0B63;color:#fff;padding:28px;border-radius:16px 16px 0 0"><h1 style="margin:0;font-size:24px">${isInst ? "Thank you" : "You're in"}, ${first}.</h1></div>
<div style="border:1px solid #E4DEEE;border-top:0;padding:28px;border-radius:0 0 16px 16px">
<p>We've received your payment of <b>${naira(row.amount)}</b>.</p>
<p><b>Plan:</b> ${planLine}<br><b>Reference:</b> ${esc(row.tx_ref)}<br><b>Classes start:</b> ${COHORT_START}</p>
${isInst ? "" : `<p><b>Your next steps</b></p><ol>
<li><a href="${WHATSAPP_GROUP}">Join your cohort's WhatsApp group</a></li>
<li><a href="${PROFILE_FORM}">Complete your student profile</a></li>
<li>Attend orientation. We'll share the link in the WhatsApp group.</li></ol>`}
<p>Questions? Reply to this email or write to info@npdacademy.com.</p>
<p style="color:#574E68">Nerdy Pixels Academy</p></div></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: [row.email], subject, html }),
  });
  if (!res.ok) {
    console.error("Resend failed", res.status, await res.text());
    return;
  }
  const db = await admin();
  await db.from("enrolments").update({ email_sent_at: new Date().toISOString() }).eq("id", row.id);
}
