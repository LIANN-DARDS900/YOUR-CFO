# Privacy and security notes

## Implemented MVP controls

- Staging identity comes from signed platform headers. Public identity comes from Supabase Auth and is verified server-side before use.
- Public access and refresh tokens use secure, HTTP-only cookies; financial tables never store passwords or raw tokens.
- Every profile read and mutation joins or validates `profile_memberships` server-side.
- Financial profiles and their ledgers are isolated by `profile_id`.
- Owner, Member, and View-only permissions are enforced on mutation paths.
- Data-changing inputs are bounded and validated server-side.
- Money uses integer minor units.
- API keys remain server-side environment variables.
- External AI receives only selected aggregate context, never the full ledger.
- AI output is displayed as explanation, not used as arithmetic source of truth.
- Local deterministic behavior works without external providers.
- External AI enhancement is capped per user and day; deterministic local analysis remains available after the limit.

## Boundaries

The application does not claim bank-grade security. It does not connect to banks, process payments, or provide regulated financial advice. Before large-scale handling of sensitive data, a production review should add structured audit logs, membership invitation verification, retention controls, dependency monitoring, abuse monitoring, backup/recovery procedures, and focused penetration testing.
