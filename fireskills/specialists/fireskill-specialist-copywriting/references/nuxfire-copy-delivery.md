# Nuxfire Copy Delivery (what exists, measured 2026-09-25)

Where the text of the products lives, what the gate checks, and the state of the current copy.

## 1. Where the text lives

| Id | Fact | Source | Read | Mode |
| --- | --- | --- | --- | --- |
| D1 | Three languages: `en` (source), `pt-br`, `es`. The public site keeps its text in `apps/web/i18n/locales/{en,pt-BR,es}.json` (about 48 to 52 KB each); the dashboard and the login app each have their own `i18n/locales/{en,pt-BR,es}.json`; layers have per-namespace locale files. | apps/web/i18n/locales, apps/app/i18n/locales, apps/login/i18n/locales, layers/*/i18n | 2026-09-25 | CMD |
| D2 | `bun run check:i18n` requires every locale file of an `i18n/locales/` directory to have the same key set as `en.json` (no missing and no extra keys) and checks docs translations. | scripts/check-i18n-completeness.ts, package.json | 2026-09-25 | CODE |
| D3 | The marketing namespace is `landing` in the web locale files; marketing `.vue` files are `apps/web/app/components/landing`, `testimonial`, `pricing` and `pages`. | scripts/copy-config.json | 2026-09-25 | CODE |
| D4 | Transactional emails are React templates in `packages/emails/templates`: `Invitation`, `VerificationCode` and `Welcome`. | packages/emails/templates | 2026-09-25 | CMD |
| D5 | `check:copy` audits templates, locale files and ledger: claims (patterns for percentages, multipliers, prices, counts and absolutes in three languages), urgency phrases, testimonials and their images, and literal text in `.vue` templates under `apps` and `layers`. Rule ids: `claim-unproven`, `claim-evidence`, `claim-verifier`, `claim-text-mismatch`, `urgency-unproven`, `testimonial-unverified`, `testimonial-shared-image`, `testimonial-unregistered-image`, `literal-text`, `ledger-invalid`, `owner-statement`, `pattern-invalid`, `allowance-owner`, `allowance-stale`. | scripts/copy-rules.ts, scripts/check-copy.ts, scripts/copy-config.json | 2026-09-25 | CODE |
| D6 | State of the current text (dated baseline of 2026-09-25): 310 `literal-text` (templates with text outside the locale files), 152 `claim-unproven`, 11 `testimonial-unregistered-image`, 8 `testimonial-unverified` and 1 `urgency-unproven` (`landing.pricing.earlyBirdNote`, in `en`). All are owned by `BACKLOG-landing-refactor` or `BACKLOG-app-ui-copy`. | scripts/copy-baseline.json | 2026-09-25 | CODE |
| D7 | The ledger `.fireskills/CLAIMS.yml` is empty by design: no claim, testimonial or offer has been proven yet, and none was invented to fill it. | .fireskills/CLAIMS.yml | 2026-09-25 | CODE |
| D8 | A finding the ledger work made: the landing says "20 Audited PostgreSQL Tables" (`landing.` block of `en.json`, line 565) while the schema files declare 21 `pgTable(` calls (layers `admin`, `billing`, `kanban`, `notifications`, `teams` and `apps/functions/src/database/core-schema.ts`); whichever is right, the claim is not proven until a `repo-count` record says which. | apps/web/i18n/locales/en.json and `grep -o "pgTable("` over the schema files | 2026-09-25 | CMD |
| D9 | The landing holds the text "Early access with 40+ devs testing on Discord & GitHub" (`en.json`, line 561) for which the repository has no evidence. | apps/web/i18n/locales/en.json and specs/draft/0002-web-performance-search-copy-specialists/research/baseline-measurements.md (M13) | 2026-09-25 | CMD |
| D10 | Two testimonial photos are reused for different names in the code (`xZ4wg2Xj.jpeg`, `FJkauyEa.jpeg`); whether the people are real is unknown. | specs/draft/0002-web-performance-search-copy-specialists/research/baseline-measurements.md (M13) | 2026-09-25 | CMD |
| D11 | User notifications go through `useNotification` (`success`, `error`, `info`, `warning`, `message`, `confirm`), `window.confirm` is never used, and the text of a caught error comes from `getErrorMessage(error)`; the project rule is enforced by `scripts/notification-rules.test.ts`. The words passed to these calls are application text and follow `application-text.md`. | .fireskills/RULES.md, apps/app/shared/utils/error-message.ts | 2026-09-25 | CODE |
| D12 | `getErrorMessage` returns the `message` of whatever was thrown, and when there is none the English fallback "Something went wrong": the generic message that `application-text.md` (E2, C1) asks not to show. It is not localised. A finding for `BACKLOG-app-ui-copy`, not fixed here. | apps/app/shared/utils/error-message.ts | 2026-09-25 | CODE |

## 2. Working rules for this codebase

- A change to marketing text: brief, draft, ledger record for each claim, three locales together,
  `bun run check:copy`, `bun run check:i18n`, read it on the page. Lower the baseline in the same
  change when it removes a baselined entry (the gate fails a stale entry).
- A new `.vue` text: a locale key from the start; do not add to the 310 literals.
- A new claim: a ledger record with a verifier that fails when it stops being true.
- A testimonial: the record first (person, use, consent, own photo, provenance), then the text.
- A time-limited offer: the `offers` record with the real dated limit, then the phrase.
- Never delete or reword a baseline entry to make the gate pass without doing what it asks.

## 3. What Does NOT Exist

- **No voice-of-customer data** in the repository (no interview notes, support threads, review
  corpus). Marketing copy written today is hypothesis copy.
- **No proven claim**: the ledger has zero records, so every number on the landing is baselined.
- **No verified testimonial** and no consent record; the photos are unregistered.
- **No enforced offer**: the early-bird note has no dated limit behind it.
- **No copy for the dashboard app under the gate's control beyond the literal-text scan**: the
  310 literals are English text inside templates, owned by `BACKLOG-app-ui-copy`; localising them
  is not done.
- **No structured review of the transactional emails** for voice or language: they are React
  templates that were not audited by the gate (it scans `.vue`).
- **No raw copywriting material in the repository**: the owner's local folder was removed from
  the machine and never committed; the pattern library was built without it
  (`references/pattern-library.md` explains the consequence).
- **No test of any copy on real visitors**: no A/B or preference test has been run.
