import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { verifyPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/payment-return")({
  head: () => ({
    meta: [
      { title: "Confirming your payment | Nerdy Pixels Academy" },
      { name: "description", content: "We're confirming your payment with our payment partner." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const verify = useServerFn(verifyPayment);
  const [msg, setMsg] = useState("Confirming your payment…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const status = p.get("status");
    const txRef = p.get("tx_ref") ?? "";
    const id = p.get("transaction_id") ?? "";
    if (status === "cancelled" || !id) {
      setFailed(true);
      setMsg("Your payment was cancelled. No money was taken.");
      return;
    }
    verify({ data: { txRef, transactionId: id } })
      .then((r) => {
        if (!r.ok) {
          setFailed(true);
          setMsg("We couldn't confirm this payment yet. If you were charged, message us on WhatsApp with reference " + txRef + ".");
          return;
        }
        const read = (k: string) => {
          try { return JSON.parse(sessionStorage.getItem(k) || "null"); } catch { return null; }
        };
        if (r.kind === "instalment") {
          const pend = read("npa-pending-instalment") || {};
          sessionStorage.setItem("npa-last-instalment", JSON.stringify({ ...pend, month: r.month, ref: r.ref, first: pend.first || "" }));
          window.location.replace("/#/pay-instalment/success");
        } else {
          const pend = read("npa-pending-order") || {};
          sessionStorage.setItem("npa-last-order", JSON.stringify({ ...pend, plan: r.plan, amount: r.amount, ref: r.ref, cur: "NGN" }));
          sessionStorage.removeItem("npa-co");
          window.location.replace("/#/checkout/success");
        }
      })
      .catch(() => {
        setFailed(true);
        setMsg("Something went wrong confirming your payment. Please contact us with reference " + txRef + ".");
      });
  }, [verify]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Poppins, sans-serif", padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, marginBottom: 12 }}>{failed ? "Payment not completed" : "One moment"}</h1>
        <p>{msg}</p>
        {failed && (
          <p style={{ marginTop: 20 }}>
            <a href="/#/checkout" style={{ fontWeight: 600 }}>Back to checkout</a>
          </p>
        )}
      </div>
    </div>
  );
}
