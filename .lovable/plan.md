# Send all sign-in emails through Resend

## Goal
Every account email (confirm signup, password reset, magic link, email change, invite, re-authentication) is sent by Resend from info@npdacademy.com, in the Nerdy Pixels brand, instead of Supabase's default sender.

## What you will see
- Emails arrive from "Nerdy Pixels Academy <info@npdacademy.com>".
- Branded design: logo, purple header, green button, Poppins-style font, white background.
- A "Forgot password?" link on the admin sign-in page, plus a page to set a new password.
- Supabase's default emails stop.

## Steps
1. Build branded email templates for the 6 email types.
2. Add a secure receiver on the site that Supabase calls whenever it needs to send an account email. It checks Supabase's signature, picks the right template, and sends it through Resend.
3. Add "Forgot password?" to /auth and a new /reset-password page.
4. Publish, then you switch it on in Supabase (one-time, about 2 minutes):
   - Supabase dashboard, Authentication, Hooks, "Send Email hook", type HTTPS.
   - URL: `https://bootcamp.npdacademy.com/api/public/auth-email-hook`
   - Click "Generate secret" and paste it to me when asked; I save it securely.
   - Authentication, URL Configuration: Site URL `https://bootcamp.npdacademy.com`, and add `/reset-password` to redirect URLs.
5. Test: sign up a new test account and request a password reset; confirm both emails arrive from info@npdacademy.com.

## Fallback if the hook fails
If Resend is down or rejects a send, the receiver reports an error to Supabase so the user sees "couldn't send email, try again" rather than silently getting nothing.

## Simpler alternative (not chosen)
Supabase's "Custom SMTP" setting with Resend's SMTP details also routes emails through Resend with no code, but templates must then be edited by hand in the Supabase dashboard. Say if you prefer this.

## Technical details
- Templates: React Email components in `src/lib/auth-emails/*.tsx` (signup, recovery, magiclink, email_change, invite, reauthentication); render with `@react-email/render`.
- Route: `src/routes/api/public/auth-email-hook.ts` (POST). Verify with `standardwebhooks` using secret `SEND_EMAIL_HOOK_SECRET` (strip `v1,whsec_` prefix). Payload `{ user, email_data: { token, token_hash, redirect_to, email_action_type, site_url, token_new, token_hash_new } }`.
- Action link: `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`. email_change sends to both addresses when `token_hash_new` present.
- Send via Resend `POST https://api.resend.com/emails` with existing `RESEND_API_KEY`, from `info@npdacademy.com`. Non-2xx returns `{ error: { http_code, message } }` with status 500.
- `/auth`: `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`; `/reset-password` public route calls `supabase.auth.updateUser({ password })` after the recovery session arrives.
- New secret: `SEND_EMAIL_HOOK_SECRET`. Add packages `@react-email/components`, `@react-email/render`, `standardwebhooks`.
- Record in AGENTS.md: auth emails go through the Send Email hook route + Resend, not Supabase default or Lovable Emails (project uses external Supabase and user chose Resend).
