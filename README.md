# Your CFO

A local-first personal finance decision system designed to answer practical questions such as **“Can I afford this?”**, **“Am I spending too fast?”**, and **“What should I reduce?”**

> **Status:** private alpha — product foundations are under revision. The current static application demonstrates the decision model, but it is not production-ready and should not be used as professional financial advice.

## Product direction

Most finance applications display transactions after the fact. Your CFO is being designed around decisions:

- estimate a conservative income baseline;
- separate fixed commitments from flexible budget envelopes;
- calculate safe-to-spend capacity;
- evaluate purchases before they become expenses;
- track goals and recurring obligations;
- explain financial health in plain language;
- detect unusually expensive versions of repeated habits;
- generate deterministic reports, briefings, diagnoses, and recommendations.

The current MVP uses deterministic JavaScript rules. It does not require an AI provider, backend, external account, or paid service.

## Current experience

- onboarding and persona-aware thresholds;
- dashboard command center;
- daily expense entry;
- fixed bills;
- flexible budget envelopes;
- savings goals;
- affordability checks;
- period-based reports;
- CFO diagnosis and saving-opportunity questions;
- local browser persistence through `localStorage`.

## Architecture

```text
HTML pages
  -> page controllers
  -> CFOEngine
  -> deterministic domain engines
  -> CFOStorage
  -> localStorage
```

The calculation layer is split into focused engines under `js/engines/`:

| Area | Responsibility |
| --- | --- |
| Income | Normalize fixed and irregular income conservatively |
| Expenses | Aggregate spending and identify lifestyle anomalies |
| Budget | Separate commitments, envelopes, goals, and safe-to-spend |
| Affordability | Evaluate a proposed purchase against current capacity |
| Goals | Track target amount, contribution, and progress |
| Reports | Build period summaries from normalized financial data |
| Saving opportunities | Estimate reducible spending |
| Financial health | Produce a transparent rule-based health assessment |
| Recommendations | Turn calculations into actionable guidance |
| Briefing | Prepare the dashboard decision summary |
| Decision guard | Evaluate an expense before it is saved |
| Diagnosis | Answer report-level financial questions |

## Run locally

No build step is required. Serve the repository with any static HTTP server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Application data remains in the current browser profile. Clearing site storage removes local data.

## Important model rules

- Fixed bills are real recurring commitments.
- Budget envelopes are planning limits, not duplicate expenses.
- Transactions represent actual spending.
- Income estimates for irregular earners use conservative normalization.
- Reports may distinguish cash-basis activity from normalized recurring costs.
- Insufficient history must not produce confident lifestyle-creep conclusions.

## Current limitations

Before a public MVP, the project still needs:

- finalized affordability and edge-case rules;
- one explicit currency strategy;
- stronger imported-data validation and output escaping;
- permanent automated regression tests;
- accessibility and responsive-layout verification;
- export, backup, and recovery behavior;
- a documented data migration strategy;
- product and legal review of financial guidance.

There is no authentication, cloud synchronization, bank connection, encryption layer, or multi-device support.

## Privacy

The current alpha is local-only: it does not send financial data to a server. That reduces exposure but does not make the browser a secure financial vault. Do not enter real sensitive financial information during development.

## License

No public reuse license has been selected. All rights reserved © Ilyas Nazih.
