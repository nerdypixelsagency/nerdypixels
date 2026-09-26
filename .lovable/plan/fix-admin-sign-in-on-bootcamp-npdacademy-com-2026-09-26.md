# Fix admin sign-in on bootcamp.npdacademy.com

## What is going wrong
1. **"Access check failed"** — the custom-domain copy of the site (hosted on Vercel) doesn't have the site's private settings (database connection details, keys). Every admin check that runs on the server there fails, even though your account is a confirmed super admin. This is the same cause as the earlier email-hook 500.
2. **"email rate limit exceeded"** — Supabase counts every email it *asks* for (sign-up, reset, magic link) against a small hourly limit, even though Resend sends them. Repeated sign-up / reset clicks used it up. Plain password sign-in sends no email, but the page currently shows old Supabase errors.

## Fix

### 1. Resend fully owns sign-in emails (no Supabase limit)
- New server actions for "Create account" and "Forgot password": the server creates the confirm / reset link itself (Supabase's admin link generator, which sends nothing and has no email limit) and sends it with Resend from info@npdacademy.com, using the existing branded templates.
- The sign-in page stops calling Supabase's email-sending functions entirely.
- Resend failures retry automatically (up to 3 times with back-off); on final failure the user sees a clear "We couldn't send the email, try again in a minute" message.
- The existing email hook stays as a safety net.

### 2. Admin area works on the custom domain (self-healing)
- Custom-domain server calls are relayed to the fully configured Lovable copy (same pattern already used for the email hook), so the admin data loads regardless of Vercel settings.
- Access check gets a second path: if the server check fails, the browser checks your role directly (protected by database rules), then retries the server once in the background.
- Session self-repair: expired/broken sessions are refreshed automatically once; only if that fails is the user sent to sign in again.
- Friendly error mapping on the sign-in page (rate limit, wrong password, unconfirmed email) instead of raw codes; the sign-in button is briefly locked after each attempt to avoid repeat clicks.

### 3. Verification
- Mint a session for fegokendigital@gmail.com and open /admin in a real browser: dashboard, Enrolments, Referrals, Instalments, Team all load.
- Test "Forgot password" goes through Resend without Supabase's limit.
- Call the custom domain's endpoints after publishing to confirm the relay works.

## Recommended (your side, optional but best)
Add these to Vercel → Project → Settings → Environment Variables so the custom domain doesn't need the relay: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SEND_EMAIL_HOOK_SECRET, FLW keys. I can list exact names when ready.

## Technical details
- `src/lib/auth-actions.functions.ts`: `requestSignup`, `requestPasswordReset` using `supabaseAdmin.auth.admin.generateLink` (`signup` / `recovery`) + `sendViaResend` with retry/backoff; generic responses to avoid email enumeration.
- `src/routes/auth.tsx`: use those actions; error-message mapper; cooldown.
- `src/lib/admin.functions.ts` + admin index route: client fallback via `supabase.rpc('claim_super_admin')` + `user_roles` select; `refreshSession()` retry on 401.
- Relay: in `src/start.ts` request middleware, when host is bootcamp.npdacademy.com and `SUPABASE_URL` is missing, forward `/_serverFn/*` requests to nerdypixels.lovable.app (headers incl. Authorization preserved).
- Record the relay rule in AGENTS.md.
