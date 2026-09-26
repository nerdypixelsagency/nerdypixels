import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual, createHash } from "crypto";

function same(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

export const Route = createFileRoute("/api/public/flutterwave-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secrets = [process.env["FLW_SECRET_HASH"], process.env["FLW_TEST_SECRET_HASH"]].filter(Boolean) as string[];
        const sig = request.headers.get("verif-hash") ?? "";
        if (!sig || !secrets.some((s) => same(sig, s))) return new Response("Invalid signature", { status: 401 });
        const body = (await request.json().catch(() => null)) as { data?: { id?: number | string; tx_ref?: string } } | null;
        const id = body?.data?.id;
        const txRef = body?.data?.tx_ref;
        if (!id || !txRef || typeof txRef !== "string" || txRef.length > 60) return new Response("ok");
        const { confirmPayment } = await import("@/lib/payments.server");
        await confirmPayment(String(id), txRef).catch((e) => console.error("Webhook confirm failed", e));
        return new Response("ok");
      },
    },
  },
});
