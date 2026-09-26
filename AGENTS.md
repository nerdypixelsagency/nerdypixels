<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Public site is the plain-JS hash router in `src/site/app.js`; it calls server functions only through `window.__npaPay` / `window.__npaEvent` set in `src/routes/index.tsx`. Why: keeps the ported site intact while giving it a real backend.
- Payment amounts are decided server-side in `src/lib/payments.functions.ts`; a record is only marked paid after Flutterwave verification (`confirmPayment`, used by both `/payment-return` and the webhook). Why: never trust browser amounts or redirects.
- Admin access uses `user_roles` + `is_admin`/`has_role`; the owner email self-claims super_admin via `claim_super_admin()` only when verified. Why: roles must never live on profiles or the client.

- Auth emails go through the Supabase Send Email hook at `/api/public/auth-email-hook`, sent via Resend (`src/lib/auth-emails.server.ts`). Why: external Supabase project; user chose Resend over Supabase default sender.
- Deployments without backend env (Vercel custom domain) relay /_serverFn calls to nerdypixels.lovable.app via relayMiddleware in src/start.ts; auth sign-up/reset links are generated server-side (admin.generateLink) and sent by Resend. Why: Vercel lacks secrets; avoids Supabase email rate limits.
- Instalment reminders run daily via pg_cron → `/api/public/cron/instalment-reminders` (token in `private_settings.cron_token`, service-role only); dedupe via `instalment_reminders` unique index. Why: stateless workers need durable once-only sends.
