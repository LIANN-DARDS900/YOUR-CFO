# Your CFO — Comprehensive MVP Progress and Technical Audit

**Audit date:** 26 August 2026  
**Project:** Your CFO  
**Product position:** Local-first personal finance decision system  
**Technology:** HTML, CSS, vanilla JavaScript, and `localStorage` only  
**Repository branch:** `main`  
**Baseline commit:** `4a794f3 Initial commit - Your CFO MVP`  
**Audit purpose:** Give an external reviewer or ChatGPT a complete, evidence-based picture of current progress, working behavior, technical debt, and recommended next work.

---

## 1. Executive summary

Your CFO is now a **functional decision-first MVP/alpha**, not just an expense tracker or a visual prototype.

The strongest part of the product is the connected decision layer:

- The Dashboard opens as a CFO Command Center.
- `safeToSpend` is treated as a primary decision value.
- Dashboard, financial health, recommendations, daily briefing, and CFO Diagnosis share the same monthly analysis.
- Reports open with a diagnosis rather than a passive table.
- The Expense Guard evaluates purchases before they are saved and records warning flags.
- Fixed bills, budget envelopes, transactions, and goals remain separate concepts.
- Existing `localStorage` data remains compatible.

The project is approximately **65–70% of a solid static MVP**. That percentage is a product-readiness estimate, not a test-coverage statistic. The core command-center direction is working, but the app is **not production-ready yet** because affordability logic, currency consistency, data validation, security hardening, accessibility, and repeatable automated tests still need work.

### Current maturity verdict

> **Functional decision-first MVP with a strong Dashboard and Reports layer, but still an alpha from a reliability and hardening perspective.**

### Highest-value next fixes

1. Correct the affordability engine and route “Add as Expense” through the Expense Guard.
2. Either make currency truly profile-driven or explicitly make this a MAD-only MVP.
3. Escape imported/user content on Bills, Envelopes, and Goals.
4. Centralize duplicated page calculations in the existing engines.
5. Add a small permanent regression suite and protect the current work in Git.

---

## 2. Repository snapshot

Before this audit file was added, the project contained:

- 34 HTML/CSS/JavaScript source files
- approximately 4,657 source lines
- 9 HTML pages
- 1 shared stylesheet
- 4 core JavaScript files
- 12 deterministic engine files
- 8 page-controller files
- no framework, package manager, backend, database, API, authentication, or build system

### Git state

The repository has only one committed revision: the original MVP commit. The current upgrade exists as uncommitted working-tree changes on `main`.

Relative to the initial commit:

- 16 existing files are modified
- approximately 1,274 lines were added
- approximately 404 lines were removed

This is an operational risk: the upgrade works, but it does not yet have a clean reviewable checkpoint or easy recovery point. No GitHub push has been performed.

### Current structure

```text
your-cfo/
├── index.html
├── onboarding.html
├── dashboard.html
├── expenses.html
├── bills.html
├── envelopes.html
├── afford.html
├── goals.html
├── reports.html
├── css/
│   └── style.css
└── js/
    ├── models.js
    ├── thresholds.js
    ├── storage.js
    ├── cfo-engine.js
    ├── engines/
    │   ├── incomeEngine.js
    │   ├── expenseEngine.js
    │   ├── budgetEngine.js
    │   ├── affordabilityEngine.js
    │   ├── goalEngine.js
    │   ├── reportEngine.js
    │   ├── savingOpportunityEngine.js
    │   ├── financialHealthEngine.js
    │   ├── recommendationEngine.js
    │   ├── briefingEngine.js
    │   ├── decisionGuardEngine.js
    │   └── diagnosisEngine.js
    └── pages/
        ├── onboarding.js
        ├── dashboard.js
        ├── expenses.js
        ├── bills.js
        ├── envelopes.js
        ├── afford.js
        ├── goals.js
        └── reports.js
```

---

## 3. Product architecture

The current architecture has a good foundation for a no-build static application.

```text
User forms and commands
        │
        ▼
CFOStorage — localStorage key: your_cfo_data_v1
        │
        ├── profile
        ├── incomeEntries
        ├── fixedBills
        ├── budgetEnvelopes
        ├── transactions
        └── goals
        │
        ▼
Deterministic calculation engines
        │
        ├── CFOEngine.getDashboardAnalysis()
        │       ├── income analysis
        │       ├── expense analysis
        │       ├── budget / safe-to-spend
        │       ├── financial health
        │       └── recommendation
        │
        ├── BriefingEngine → Dashboard decisions
        ├── DiagnosisEngine → Report decisions
        └── DecisionGuardEngine → pre-save expense decisions
```

### Important design success

The app has not collapsed all money into one generic expense object:

| Data type | Meaning | Current use |
|---|---|---|
| `fixedBills` | Real recurring commitments | Monthly normalization, buffer, report pro-rating |
| `budgetEnvelopes` | Planned flexible budgets | Envelope usage and spending-speed pacing |
| `transactions` | Real daily spending | Monthly totals, intent/category analysis, reports, guard |
| `goals` | Savings targets | Planned contributions, risk, progress |
| `incomeEntries` | Logged income history | Variable-income baseline calculation |

This separation should be preserved.

---

## 4. Core deterministic logic

### 4.1 Safe-to-spend

The central monthly calculation is:

```text
safe-to-spend
= safe monthly income
- normalized fixed bills
- current-month transactions
- active goal monthly contributions
- emergency buffer
```

The emergency buffer is:

```text
normalized fixed bills × user-type safety-buffer months
```

Budget envelopes are planning ceilings, not additional real spending. They are therefore not subtracted again from `safeToSpend`; their actual linked transactions are subtracted.

### 4.2 Today’s maximum spending

The daily limit is centralized in `BudgetEngine.calculateTodayLimit()`:

```text
max(0, safe-to-spend) ÷ remaining calendar days including today
```

The value is rounded down. Both the Dashboard briefing and Expense Guard use this function.

### 4.3 Income logic

- Fixed/monthly/family-support income is normalized to a monthly figure.
- Weekly income uses `amount × 52 ÷ 12`.
- Daily income uses `amount × 30`.
- Logged income considers entries from the last 90 days and divides their sum by three.
- Freelancer and business-owner baselines apply conservative multipliers.
- No-income users enter Spending Control Mode and receive no normal health score.

One design question remains: variable-income logic uses the **higher** of profile baseline and logged 90-day average before applying conservatism. If the profile baseline is stale and optimistic, this may still overstate safe income.

### 4.4 Financial health

The health score uses:

- savings rate
- fixed-cost ratio
- lifestyle spending ratio
- income stability
- safe-to-spend margin
- reserved money versus income

A Strong or Stable status now requires at least a 10% positive safe-to-spend margin. Negative safe-to-spend caps the score so it cannot become Strong.

### 4.5 Lifestyle creep

Lifestyle creep is deterministic:

- match previous transactions by normalized label and category
- require at least 7 historical entries
- require at least 14 days of history
- compare the new price with the historical median
- alert when the new price exceeds 1.5 times the median
- ignore multi-quantity purchases

### 4.6 Saving opportunities

The app identifies lifestyle spending and currently recommends a fixed 30% reduction. This is deterministic, but the 30% policy is hard-coded and not explained by profile risk tolerance or another documented business rule.

---

## 5. Progress completed in the current upgrade

### 5.1 Dashboard is now decision-first

The first page hierarchy is now:

```text
CFO Briefing
→ Today’s decision
→ Explanation
→ Today’s max spending
→ Biggest lifestyle leak
→ Goal risk
→ Safe-to-spend
→ Next CFO Actions
→ CFO Commands
→ Supporting numbers
```

Completed behavior includes:

- a primary CFO Briefing card
- visible pressure/danger state for negative safe-to-spend
- Today’s max spending
- biggest lifestyle leak
- goal-risk summary
- Next CFO Actions
- supporting values placed after decisions
- responsive, premium black/white/subtle-blue styling

### 5.2 Profile form is now discoverable

The onboarding form already existed, but it was easy to miss. The Dashboard now provides:

- a visible **Create my financial profile** button when no profile exists
- a clickable profile badge that opens `onboarding.html`
- an existing-profile edit route through the same page

The onboarding page contains fields for name, user type, income type, income amount, currency, and risk tolerance.

### 5.3 CFO Commands are wired

| Command | Route |
|---|---|
| CFO Diagnosis | `reports.html?action=diagnosis&period=this_month` |
| Can I afford this? | `afford.html` |
| How much could I have saved? | `reports.html?action=saved&period=this_month` |
| Where did I lose money? | `reports.html?action=lost&period=this_month` |
| What should I reduce? | `reports.html?action=reduce&period=this_month` |

### 5.4 Data Tools are secondary

Demo, export, import, and reset tools still exist but now live inside a collapsed `<details>` area. They no longer compete visually with the briefing.

### 5.5 Reports are diagnosis-first

Completed behavior includes:

- CFO Diagnosis loads automatically on a normal page visit.
- There is no weak default placeholder.
- URL actions are respected.
- Invalid URL actions safely fall back to diagnosis.
- A supported URL period is selected before the action runs.
- Changing the period runs CFO Diagnosis by default.
- Diagnosis HTML is intentionally formatted and escaped.
- Raw `<strong>` and `<br>` tags are not displayed to the user.

### 5.6 Reports script dependency order is fixed

`reports.html` now loads dependencies in the required order:

```text
models → thresholds → storage
→ income → expense → budget → health → recommendation
→ CFOEngine
→ report → saving opportunity → diagnosis
→ reports page controller
```

This resolves the previous `CFOEngine.getDashboardAnalysis()` dependency failure in `diagnosisEngine.js`.

### 5.7 Dashboard and Diagnosis are aligned

Diagnosis now uses the same current Dashboard analysis for:

- safe-to-spend
- financial health status
- no-income mode
- fixed monthly commitments
- current safe monthly income

It combines that with selected-period report values for:

- estimated income
- real savings
- transaction spending
- pro-rated fixed commitments
- biggest category
- lifestyle ratio

Negative safe-to-spend has the highest precedence. A report can show positive basic savings while still returning **Budget pressure detected** if goals, buffers, and commitments make CFO safe-to-spend negative.

### 5.8 Expense Guard remains intact

The normal Expenses form follows this flow:

```text
expense draft
→ DecisionGuardEngine before save
→ user confirmation when required
→ transaction saved with system flags
→ lifestyle-creep check
→ list and statistics refresh
```

Supported warnings and behavior:

- over daily limit
- purchase turns the monthly budget negative
- existing budget pressure
- no profile
- no-income lifestyle risk
- lifestyle creep
- transaction flags in the UI
- confirmed transaction deletion
- live statistics refresh

### 5.9 Storage compatibility is preserved

- Storage key remains `your_cfo_data_v1`.
- No existing collection name was changed.
- Missing legacy arrays are normalized to empty arrays.
- Unknown root fields are preserved during compatible imports and loads.
- Legacy goals with a missing status are treated as active by the Budget, Briefing, and Goal engines.

### 5.10 Other reliability improvements

- Report dates use local calendar formatting rather than UTC `toISOString()` boundaries.
- The current month correctly resolves to 1–31 August 2026 in the current Casablanca test environment.
- Shared HTML escaping was added and is used in upgraded Dashboard, Reports, and Expenses rendering.
- Mobile navigation and responsive layouts were improved in the shared stylesheet.

---

## 6. Page-by-page status

| Page | Status | Working now | Main remaining work |
|---|---|---|---|
| `index.html` | Working | Routes new users to onboarding and existing users to Dashboard | Visual copy is still tracker-oriented; direct `file://` behavior needs explicit cross-browser validation |
| `onboarding.html` | Working / partial | Creates and reloads profiles; visible Dashboard CTA now routes here | Currency and risk tolerance are stored but not consistently used; labels need `for` attributes |
| `dashboard.html` | Strong | Decision-first briefing, commands, supporting numbers, profile CTA, secondary data tools | Currency formatter is hard-coded; broader accessibility QA needed |
| `expenses.html` | Strong | Add, guard, confirm, flags, creep detection, delete, stats | Shared currency, edit flow, deeper validation |
| `bills.html` | Functional / partial | Add, monthly normalization, total, delete | Duplicates BudgetEngine logic; unsafe HTML rendering; no edit; no delete confirmation |
| `envelopes.html` | Functional / partial | Add, usage, progress, unlink transactions on delete | Duplicates engine logic; unsafe HTML rendering; no edit; no delete confirmation |
| `afford.html` | High-risk partial | Produces a deterministic verdict and can create a goal | Several correctness/integration defects; see Priority findings |
| `goals.html` | Functional / partial | Add, contribute, complete, delete, progress | Duplicates GoalEngine; legacy-status UI mismatch; unsafe HTML; no edit/confirmation |
| `reports.html` | Strong | Default diagnosis, URL actions, periods, formatted output, supporting values | “Spending too fast” ignores selected historical period; current-month safe-to-spend can dominate a historical diagnosis |

---

## 7. Acceptance and verification evidence

### Static checks rerun on 26 August 2026

| Check | Result |
|---|---|
| Syntax check for every JavaScript file using `node --check` | Pass |
| `git diff --check` | Pass |
| Red syntax errors found | None |
| Dependency order in `reports.html` | Pass |

Git emitted only line-ending notices indicating LF may become CRLF on Windows; these are warnings, not syntax or whitespace failures.

### Deterministic fixture checks

| Scenario | Observed result | Result |
|---|---|---|
| `typeof CFOEngine` | `"object"` | Pass |
| `typeof DiagnosisEngine` | `"object"` | Pass |
| Positive report savings plus negative safe-to-spend | Report savings `9300`, safe-to-spend `-1000`, verdict `Budget pressure detected` | Pass |
| Large lifestyle purchase over daily limit and monthly capacity | `danger` with `over_daily_limit` and `turns_budget_negative` | Pass |
| Current-month Casablanca date range | `2026-08-01` through `2026-08-31` | Pass |
| Demo, export, compatible import, and reset data-tool harnesses | Expected storage and refresh behavior | Pass |
| No-income affordability calculation | Suggested `500 MAD/month` despite zero capacity | **Fail — confirmed defect** |

### Browser smoke checks completed during the upgrade

- Dashboard renders the decision-first hierarchy.
- Negative safe-to-spend shows pressure/danger language.
- Reports load CFO Diagnosis without a placeholder.
- Diagnosis sections render as HTML rather than raw tags.
- Changing the report period regenerates diagnosis.
- A large lifestyle expense shows Over Daily Limit and Budget Pressure flags.
- Expense deletion refreshes statistics and the list.
- Profile CTA opens `onboarding.html`, and `#profileForm` is visible.
- No red console errors appeared in the tested Dashboard, Reports, Expenses, or onboarding path.

### Console acceptance behavior

On `reports.html`, the intended results are present:

```js
typeof CFOEngine       // "object"
typeof DiagnosisEngine // "object"
typeof askDiagnosis    // "function"
askDiagnosis()         // undefined is normal; the page is updated
```

### What has not been formally verified

- Safari, Firefox, mobile Safari, and multiple Chromium versions
- direct multi-page use through `file://` in each browser
- screen-reader navigation
- keyboard-only operation across all dialogs and controls
- high-volume data performance
- malicious/corrupted import files beyond basic shape checks
- automated visual regression
- persistent automated unit or integration tests

---

## 8. Priority findings and remaining risks

### P1 — Affordability flow is not reliable enough

This is the most important correctness gap.

1. `AffordabilityEngine` forces a minimum saving capacity of `500`:

   ```js
   Math.max(500, Math.round(Math.max(safeToSpend, 0)))
   ```

   A no-income user with zero capacity is therefore told to save 500 MAD per month. This invents a number and contradicts the product rule not to invent financial capacity.

2. “Add as Expense” calls `CFOStorage.addTransaction()` directly. It bypasses `DecisionGuardEngine` and does not run the same lifestyle-creep post-save path as the Expenses form.

3. The engine subtracts upcoming bills from a monthly safe-to-spend figure that already subtracts normalized fixed commitments. This may double-reserve some bills.

4. The UI expects `amount`, `safeToSpend`, `purchaseImpact`, and `statusClass`, but the engine does not return these fields. The result cards can therefore show `0 MAD`, `--`, or incomplete styling even when a verdict exists.

5. `emergencyBuffer` is calculated locally but never used after being assigned.

**Recommendation:** Rebuild the result contract around the canonical Dashboard budget analysis, remove the 500 floor, explicitly define upcoming-bill treatment, and use one shared guarded transaction-save function.

### P1 — Currency selection is misleading

Onboarding offers MAD, EUR, and USD, but almost every page and many engine messages hard-code:

- `MAD`
- `fr-MA`
- thresholds such as “above 200 MAD”

Selecting EUR or USD changes the profile badge but not the real display or advice. This is a product correctness problem, not only a presentation issue.

**Recommendation:** For the next release, choose one of two honest paths:

- implement a single shared formatter and use `profile.currency` everywhere, while keeping all entered data in one user-selected currency; or
- remove EUR/USD temporarily and label the MVP as MAD-only.

Do not add exchange-rate APIs for this MVP.

### P1 — Imported/local data can inject HTML on three pages

Dashboard, Reports, and Expenses escape dynamic labels. Bills, Envelopes, and Goals still place names, categories, priorities, periods, and IDs directly inside `innerHTML` and inline `onclick` handlers.

A crafted import can therefore create DOM injection, including event-handler injection. The local-first threat is smaller than a public multi-user service, but imports are an explicit sharing feature, so this still matters.

**Recommendation:** Use `CFO_escapeHTML()` for visible text, remove dynamic inline handlers, and attach events through `data-*` attributes and `addEventListener()` as the Expenses page already does.

### P1 — The upgrade is uncommitted

All current work is on `main` above the single initial commit. A mistaken edit is harder to isolate, review, or recover.

**Recommendation:** After review, create a `codex/...` branch or an approved checkpoint commit. Do not push unless explicitly requested.

### P1 — There is no permanent regression suite

The app has been checked with syntax tests, deterministic one-off fixtures, and browser smoke tests, but none of those fixtures live in the repository.

This is especially risky because Dashboard and Reports must never contradict each other.

**Minimum permanent cases:**

- positive report savings plus negative safe-to-spend
- no-income mode
- Strong/Stable minimum margin
- expense over daily limit
- expense turns monthly budget negative
- lifestyle-creep median threshold
- legacy data normalization
- report date ranges
- every CFO Command route

### P2 — Page controllers duplicate engine logic

- Bills reimplements bill normalization and fixed-total calculation.
- Envelopes reimplements current-month filtering and usage calculation.
- Goals reimplements progress and timeline calculations.
- `formatMAD()` is repeated across nearly every page.

This creates future contradiction risk.

**Recommendation:** Keep engines as the source of truth and introduce one small shared presentation utility for currency/date formatting.

### P2 — Legacy goal behavior is inconsistent in the Goals UI

BudgetEngine, BriefingEngine, and GoalEngine treat a missing legacy status as active. `js/pages/goals.js` only renders goals where `status === "active"`.

A legacy goal can therefore affect safe-to-spend while disappearing from the Goals page.

### P2 — Income history has an engine but no management UI

`incomeEntries` and `CFOStorage.addIncome()` exist, and irregular-income logic uses recent entries, but users cannot add, edit, or remove income entries through the interface.

For freelancers and business owners, this makes the intended 90-day baseline inaccessible without console/import manipulation.

### P2 — Profile fields are only partially operational

- `currency` is stored but not respected by formatters.
- `riskTolerance` is stored but not used by thresholds, affordability, health, or recommendations.

The UI currently promises more personalization than the engines deliver.

### P2 — Reports mix time horizons

Diagnosis deliberately combines a selected-period report with the **current monthly** Dashboard safe-to-spend. The details label this correctly, but a three-month report verdict can still be dominated by today’s current-month pressure.

“Am I spending too fast?” always analyzes the current month even when another period is selected, while the cards above it show the selected period. That can be confusing.

### P2 — Import validation is shallow

Import validates several top-level arrays and supplies missing optional arrays, but does not validate:

- record field types
- finite/non-negative numbers
- supported frequencies, categories, intents, or statuses
- duplicate IDs
- maximum file size or collection size
- unsafe strings
- schema/export version

### P2 — Direct `file://` operation needs explicit proof

The code is static-host compatible and browser tests passed through a local HTTP server. Browser behavior for `localStorage` on `file://` URLs is not standardized consistently enough to assume every multi-page browser flow will share data correctly.

**Recommendation:** Document a one-command local static server as the reliable method, while separately testing the literal double-click `index.html` requirement in Chrome, Edge, Firefox, and Safari.

### P2 — Accessibility needs a dedicated pass

Examples:

- many form labels do not use `for` attributes
- several operations rely on `alert`, `confirm`, and `prompt`
- older pages use many inline styles and dense equal-weight cards
- focus behavior after dynamic report or list updates is not managed
- no documented screen-reader or keyboard test exists

Positive work already present includes semantic headings, report `aria-live`, visible text in addition to color, and improved responsive navigation.

### P2 — Editing and recovery flows are incomplete

Users can create and delete most records, but cannot edit bills, envelopes, goals, or transactions. Bills, envelopes, and goals delete immediately without confirmation. Envelope deletion also unlinks its transactions without showing that consequence first.

### P3 — Lifestyle-creep history boundaries need refinement

The same-habit history excludes the new transaction by ID, but it does not explicitly require historical dates to be earlier than the new transaction. Backdated or future entries can influence the median.

Quantity only suppresses creep detection when greater than one; the amount is not multiplied by quantity. The intended meaning of “amount” versus “quantity” should be documented.

### P3 — Some model metadata is stale

`CFO_MODELS.flags` lists older values such as `over_budget`, `unusual`, and `money_leak`, while the live guard writes values such as:

- `over_daily_limit`
- `turns_budget_negative`
- `budget_pressure`
- `no_profile`
- `no_income_lifestyle`
- `essential_accepted`
- `cfo_approved`

The stale list is not currently driving behavior, but it is misleading documentation.

### P3 — Report engine input is not defensive

The page controller protects unsupported URL periods. A direct call to `ReportEngine.generateReport(data, invalidPeriod)` can still reach undefined dates and fail. The engine itself should reject or default invalid inputs.

---

## 9. Security and privacy assessment

### Strengths

- No account, backend, analytics SDK, advertising SDK, or third-party finance API exists.
- Normal operation does not transmit finance data to a server.
- Data export is user-triggered.
- Reset requires confirmation.
- The main upgraded decision pages escape imported/user text.

### Limitations to communicate honestly

- Financial data is stored as plaintext JSON in browser `localStorage`.
- Export files are plaintext JSON.
- Any JavaScript executing on the same origin can read the data.
- Browser profiles, extensions, malware, shared computers, and copied export files remain part of the threat model.
- There is no encryption, passcode, account recovery, sync, or backup service.

For a local-only MVP this can be acceptable, but the product should display a short privacy note and warn users that exports contain sensitive financial information.

---

## 10. Maintainability assessment

### What is working well

- Engines are small and readable.
- Finance decisions are deterministic.
- Storage is isolated in one module.
- Script dependencies are explicit.
- Safe-to-spend has a clear formula.
- Daily limit is centralized.
- Dashboard analysis is centralized in `CFOEngine`.
- No toolchain is required to read or deploy the code.

### What will become expensive if left unchanged

- global function names such as `formatMAD()` are repeated per page
- inline `onclick` handlers mix markup and behavior
- page controllers duplicate calculations
- script order is manually maintained on every page
- no test suite guards engine contracts
- no README explains setup, formulas, storage, privacy, or deployment
- all current work is one large uncommitted diff

---

## 11. Quality scorecard

These scores are audit judgments, not automated measurements.

| Area | Score | Reason |
|---|---:|---|
| Product vision / decision-first direction | 8.5/10 | Clear CFO positioning and command hierarchy |
| Dashboard and Reports UX | 8/10 | Strong hierarchy, aligned diagnosis, premium direction |
| Core deterministic finance logic | 7/10 | Good modular basis; affordability and some policies need correction |
| Data model and backward compatibility | 7.5/10 | Correct separation and stable key; validation/versioning missing |
| Expense Guard | 8/10 | Strong pre-save decisions and flags on the Expenses page |
| Affordability | 3.5/10 | Verdict exists, but invented capacity, missing result fields, and guard bypass are material defects |
| Supporting management pages | 5.5/10 | Functional CRUD-lite pages, but duplicated logic and inconsistent hardening |
| Security and privacy hardening | 4.5/10 | Local-only is a strength; three DOM-injection surfaces and plaintext exports remain |
| Accessibility | 4.5/10 | Some semantic improvements, but no dedicated pass or assistive-technology test |
| Testing and regression safety | 4/10 | Good ad hoc evidence; no permanent suite or CI |
| Static deployment readiness | 7/10 | No dependencies and relative assets; documentation and direct-file validation missing |

**Overall current readiness: approximately 6.8/10 for an MVP, below production readiness.**

---

## 12. Recommended roadmap

### Phase 0 — Protect and document the current progress

1. Review this audit.
2. Create a clean Git checkpoint after approval.
3. Add a concise README with local-server, static-host, storage, privacy, and test instructions.
4. Keep the existing storage key and collection structure unchanged.

### Phase 1 — Fix financial correctness

1. Repair `AffordabilityEngine` and its result contract.
2. Route affordability purchases through the same Expense Guard/save pipeline.
3. Remove invented minimum monthly saving capacity.
4. Decide and document upcoming-bill treatment.
5. Make currency consistent or narrow the MVP to MAD.
6. Align Goals page legacy-status behavior with GoalEngine.
7. Clarify current-month versus selected-period diagnosis semantics.

### Phase 2 — Consolidate sources of truth

1. Use BudgetEngine from Bills and Envelopes pages.
2. Use GoalEngine from Goals page.
3. Add one shared currency/date presentation utility.
4. Replace dynamic inline handlers with event listeners.
5. Keep Dashboard and Reports consuming the same canonical engine outputs.

### Phase 3 — Harden data operations

1. Add schema-aware import validation.
2. Escape all remaining dynamic output.
3. Add export metadata such as app version and schema version without renaming current data fields.
4. Add delete confirmations and explain cascading/unlink behavior.
5. Add edit flows for transactions, bills, envelopes, and goals.

### Phase 4 — Complete the product loop

1. Add income-entry management for variable-income users.
2. Make risk tolerance meaningful or remove it until it is used.
3. Add a guided setup checklist: profile → income → bills → envelopes → goal → first expense.
4. Make profile editing discoverable from all major pages.
5. Add clear empty-state actions instead of only explanatory text.

### Phase 5 — Regression and release readiness

1. Add deterministic engine tests for all decision boundaries.
2. Add a lightweight browser smoke-test checklist or static test page.
3. Test direct-file and local-server operation separately.
4. Test mobile, keyboard, and screen-reader flows.
5. Test large and malformed imports.
6. Validate deployment on at least one static host.

---

## 13. Files changed in the decision-first upgrade

| File | Main change |
|---|---|
| `dashboard.html` | CFO Command Center hierarchy, CFO Commands, collapsed Data Tools, profile CTA |
| `reports.html` | Diagnosis-first layout and corrected dependency order |
| `css/style.css` | Premium command-center styling, state treatments, responsive/mobile behavior |
| `js/models.js` | Shared HTML escape utility |
| `js/storage.js` | Backward-compatible data normalization |
| `js/engines/budgetEngine.js` | Central daily-limit function and legacy goal compatibility |
| `js/engines/financialHealthEngine.js` | Safe-to-spend consistency and healthy-margin requirement |
| `js/engines/recommendationEngine.js` | Pressure/no-income recommendation alignment |
| `js/engines/briefingEngine.js` | Decision-first daily briefing, leak, goal risk, actions |
| `js/engines/decisionGuardEngine.js` | Combined daily-limit/monthly-pressure flags |
| `js/engines/diagnosisEngine.js` | Dashboard-aware diagnosis and pressure precedence |
| `js/engines/reportEngine.js` | Local date formatting fixes |
| `js/engines/goalEngine.js` | Legacy missing-status goals treated as active |
| `js/pages/dashboard.js` | Briefing rendering, safe states, commands support, profile CTA, data tools |
| `js/pages/expenses.js` | Guard integration, flags, escaping, safe delete binding |
| `js/pages/reports.js` | Default diagnosis, URL actions, period refresh, safe formatted rendering |

---

## 14. Decisions that should not be reversed

Future work should preserve these product and architecture choices:

- keep the app static and local-first
- keep HTML/CSS/vanilla JavaScript/localStorage
- keep `your_cfo_data_v1` compatible
- keep fixed bills, envelopes, transactions, and goals separate
- keep deterministic engines as the source of truth
- keep `safeToSpend` central
- keep Dashboard and Reports logically aligned
- keep the Expense Guard before normal expense saving
- keep Data Tools secondary to financial decisions
- do not add fake AI-generated financial numbers
- do not add a backend, authentication, API, framework, or build tool without an explicit product decision

---

## 15. Suggested prompt for an external ChatGPT review

Copy this audit together with the following request:

> Review this Your CFO project audit as a senior product engineer and fintech product reviewer. The app must remain HTML, CSS, vanilla JavaScript, and localStorage only. Evaluate whether the stated progress is internally consistent, challenge any risky financial assumptions, and produce a prioritized next-release plan. Preserve the current storage key and separate data models. Pay special attention to affordability correctness, currency consistency, Dashboard/Reports agreement, Expense Guard coverage, imported-data safety, and a lightweight deterministic test strategy. Do not recommend frameworks, a backend, external APIs, authentication, or build tooling. Separate must-fix correctness work from optional polish, and do not write implementation code until the plan is agreed.

---

## 16. Final audit conclusion

The project has made meaningful progress toward the intended product:

```text
Your CFO = Command Center for financial decisions
```

It already answers the core monthly questions better than a normal tracker:

- Am I under pressure?
- What is my safe-to-spend?
- What is today’s limit?
- What is my biggest lifestyle leak?
- Are my goals creating risk?
- What should I do next?

The next milestone should not be a visual redesign. It should be a **correctness and consolidation release** centered on affordability, currency truthfulness, shared engine usage, import safety, and permanent regression tests. Once those are addressed, the project will be much closer to a dependable, shareable static MVP.
