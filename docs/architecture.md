# Architecture

## Shape

Your CFO is a single maintainable Vinext/Next.js application deployed as a Cloudflare Worker. D1 supplies relational persistence. React renders the five product areas, while route handlers own validation, authorization, aggregation, and mutation.

## Layers

1. `app/cfo-app.tsx`: responsive product experience and client interactions.
2. `app/api/auth/route.ts` and `lib/identity.ts`: dual staging/public identity boundary using platform headers or verified Supabase sessions.
3. `app/api/cfo/route.ts`: profile authorization, persistence, aggregation, rate limiting, and compact AI context preparation.
4. `lib/finance.ts`: deterministic calculation domain for availability, projections, leaks, purchases, life changes, and emergencies.
5. `lib/parser.ts`: no-key local natural-language extraction, multi-entry parsing, and classification fallback.
6. `lib/ai/providers.ts`: provider-neutral AI router for Gemini, Groq, Mistral, and OpenRouter.
7. `db/schema.ts`: normalized relational data model using integer minor units.

The LLM never calculates balances. The backend first queries and aggregates the ledger, then sends only a compact verified summary to the selected provider. If no key exists or a provider fails, deterministic local explanations remain available.

## Data model

Core tables: `users`, `financial_profiles`, `profile_memberships`, `transactions`, `categories`, `incomes`, `fixed_expenses`, `savings_pools`, `savings_contributions`, `goals`, `financial_decisions`, `decision_scenarios`, `ai_insights`, `ai_usage_daily`, and `monthly_snapshots`.

All profile-owned records carry `profile_id`. Membership queries require both profile and authenticated user identifiers. Profile write permissions are Owner/Member; administration requires Owner; View-only cannot mutate.

## Financial formulas

Available monthly cash is:

`income - fixed expenses - flexible spending - max(savings target, actual saved)`

Capital and emergency funds are kept separate from this formula. Decision functions return explicit funding sources and before/after amounts rather than a generic score.

## Provider routing

The router checks environment configuration in this order: Gemini, Groq, Mistral, OpenRouter. If a configured provider fails, it tries the next one before the route uses its deterministic local answer. It sends a system safety instruction, the user's bounded question, and a compact aggregate context. No API key is exposed to the browser.
