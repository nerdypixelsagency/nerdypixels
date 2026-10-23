// Server-only: automated-email switches and the daily summary recipients (super admin settings).
import type { AutoEmailKey } from "./access";

let cache: { at: number; v: Record<string, boolean> } | null = null;
/** Whether an automated email is switched on (default on). Cached for a minute. */
export async function autoEmailOn(key: AutoEmailKey) {
  if (!cache || Date.now() - cache.at > 60_000) {
    let v: Record<string, boolean> = {};
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "auto_emails").maybeSingle();
      v = data?.value ? JSON.parse(data.value) : {};
    } catch { v = {}; }
    cache = { at: Date.now(), v };
  }
  // The master switch turns every automation off at once; otherwise each one
  // follows its own flag. Both default on.
  return cache.v["master"] !== false && cache.v[key] !== false;
}
export const clearAutoEmailCache = () => { cache = null; };

export async function summaryRecipients() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "summary_recipients").maybeSingle();
  const list = (data?.value ?? "fegokendigital@gmail.com,hayjay.okunolaa@gmail.com").split(/[\s,;]+/).map((s: string) => s.trim().toLowerCase()).filter((s: string) => /^\S+@\S+\.\S+$/.test(s));
  return [...new Set(list)] as string[];
}
