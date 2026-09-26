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
- Public site pages come from `src/site/app.js` (plain JS, path-based). `src/routes/index.tsx` and `src/routes/$.tsx` render `SitePage`, which server-renders `renderStatic()` HTML and then boots app.js; per-page head/JSON-LD lives in `src/site/meta.ts`. Why: crawlable content without rewriting the ported site.
- Payment amounts are decided server-side in `src/lib/payments.functions.ts`; a record is only marked paid after Flutterwave verification (`confirmPayment`, used by both `/payment-return` and the webhook). Why: never trust browser amounts or redirects.
- Admin access uses `user_roles` + `is_admin`/`has_role`; the owner email self-claims super_admin via `claim_super_admin()` only when verified. Why: roles must never live on profiles or the client.

- Auth emails go through the Supabase Send Email hook at `/api/public/auth-email-hook`, sent via Resend (`src/lib/auth-emails.server.ts`). Why: external Supabase project; user chose Resend over Supabase default sender.
- Deployments without backend env (Vercel custom domain) relay /_serverFn calls to nerdypixels.lovable.app via relayMiddleware in src/start.ts; auth sign-up/reset links are generated server-side (admin.generateLink) and sent by Resend. Why: Vercel lacks secrets; avoids Supabase email rate limits.
- Instalment reminders run daily via pg_cron → `/api/public/cron/instalment-reminders` (token in `private_settings.cron_token`, service-role only); dedupe via `instalment_reminders` unique index. Why: stateless workers need durable once-only sends.

- Brand images the site, admin and emails use live in `public/brand/` as real files, not asset pointers. Why: the Vercel custom domain can't serve Lovable asset URLs.
- Admin tools live in `src/lib/admin-tools.functions.ts`; students sign in with a Resend magic link at `/student` and their records are matched by verified email on the server. Why: no student role and no client-side filtering.
