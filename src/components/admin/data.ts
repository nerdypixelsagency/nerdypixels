import { queryOptions } from "@tanstack/react-query";

export type Enrolment = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  persona: string | null;
  source: string | null;
  referral_code: string | null;
  plan: string | null;
  instalment_month: string | null;
  amount: number;
  status: string;
  tx_ref: string | null;
  paid_at: string | null;
  created_at: string;
  source_type?: string | null;
  admin_notes?: string | null;
  payment_method?: string | null;
  email_sent_at?: string | null;
  mode?: string;
};

export const enrolmentsQuery = (fn: () => Promise<unknown>) =>
  queryOptions({ queryKey: ["admin-enrolments"], queryFn: () => fn() as Promise<{ role: string; rows: Enrolment[] }> });

export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
export const PERSONAS: Record<string, string> = {
  switcher: "Career switcher",
  graduate: "Recent graduate",
  marketer: "Working marketer",
  owner: "Business owner",
  others: "Others",
};
export const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("");

export function toCsv(rows: Enrolment[]) {
  const cols: (keyof Enrolment)[] = ["created_at", "kind", "name", "email", "phone", "country", "persona", "source", "referral_code", "plan", "instalment_month", "amount", "status", "tx_ref", "paid_at"];
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c])).join(","))].join("\n");
}
export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
