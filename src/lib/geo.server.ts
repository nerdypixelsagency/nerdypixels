// Server-only: the visitor's country from the hosting platform's edge headers.
// Vercel's header wins: requests relayed from Vercel to Lovable keep it, while
// Cloudflare's header on the relayed hop would show Vercel's location instead.
export function countryFromHeaders(h: Headers): string | null {
  for (const name of ["x-vercel-ip-country", "cf-ipcountry", "x-country-code"]) {
    const v = (h.get(name) ?? "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(v) && v !== "XX" && v !== "T1") return v;
  }
  return null;
}
