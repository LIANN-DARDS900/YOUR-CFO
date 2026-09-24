# Public Cloudflare deployment

The public application runs as a full-stack Vinext Worker with Cloudflare D1. Supabase provides email/password identity only; financial records remain in D1 and every query is scoped through `profile_memberships`.

The existing ChatGPT Site remains staging. Its authenticated-user headers continue to work because `lib/identity.ts` checks them before Supabase cookies.

## One-time account setup

1. Sign in to Cloudflare and authorize Wrangler: `pnpm wrangler login`.
2. Create the database: `pnpm wrangler d1 create your-cfo-db`.
3. Copy the returned UUID into `wrangler.public.jsonc` as `database_id`.
4. Apply the schema: `pnpm db:public:migrate`.
5. Create a free Supabase project and enable email/password authentication.
6. Set Supabase's Site URL to the final Worker address and allow `https://<worker-address>/auth/callback` as a redirect URL.
7. Configure Worker secrets without committing their values:

   ```bash
   pnpm wrangler secret put SUPABASE_URL --config wrangler.public.jsonc
   pnpm wrangler secret put SUPABASE_ANON_KEY --config wrangler.public.jsonc
   pnpm wrangler secret put GEMINI_API_KEY --config wrangler.public.jsonc
   ```

8. Deploy with `pnpm deploy:public`.

## Security behavior

- Access and refresh tokens use secure, HTTP-only cookies.
- The backend validates access tokens with Supabase before accepting an identity.
- Expired sessions refresh through `/api/auth`; stored tokens are unavailable to browser JavaScript.
- Supabase user IDs are prefixed with `supabase:` to avoid collisions with staging identities.
- Passwords are handled by Supabase Auth and never stored in Your CFO tables.

## First-run behavior

New accounts receive no fabricated ledger data. Onboarding asks only for currency, monthly income, fixed monthly expenses, savings target, accumulated capital, and optional emergency fund. It creates an isolated personal profile, membership, baseline records, and separate savings pools.
