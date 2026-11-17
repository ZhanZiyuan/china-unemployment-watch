# Repository audit

Audit date: 2026-11-17 (Asia/Shanghai). Remote heads verified with `git ls-remote`: `main` at `614603cf389f516973f7c1f5d6ff03af2cef442a` and `develop` at `ba8ef003abe206eeccb3f93af1c1530c15fcce03`. The implementation follows the request to work on `develop` and keep the `src/` layout.

## Legacy data

| Checkout | Weekly rows | First period | Last period | Job search zeros | Unemployment zeros | Recruitment zeros | Exam zeros | Composite nulls | Composite 100s |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| `main` | 249 | 2020-12-28 | 2025-09-29 | 249 | 249 | 246 | 247 | 245 | 4 |
| `develop` | 158 | 2021-12-20 | 2024-12-23 | 57 | 55 | 53 | 105 | 0 | 1 |

Reproduce the counts by loading `git show 614603c:lib/trends-data.json` and `git show ba8ef00:src/lib/trends-data.json` as JSON and counting values by strict equality. Git history preserves the rejected files. Neither file has raw responses, per-series units, true source publication dates, or enough provenance to establish successful Google Trends acquisition. The zero values are indeterminate. The `main` values cannot support an employment index.

## Failure modes

- Both collectors use the unofficial `google-trends-api` package. Keywords were requested separately in overlapping six-month windows. No common reference or overlap-factor test established comparability across requests. Overlap observations were pooled after independent normalization.
- The timeout resolves to no data without aborting the request. Parsing failures become empty arrays. Empty categories are converted to zero by the median function, and no check distinguishes partial periods from complete periods. The lookback starts in 2021 and full-window iteration can omit the recent tail.
- Zero variance maps an entire component to zero. The quantile mapping divides by zero when its endpoints coincide. Serialization can turn non-finite results into null. Rolling full-history z-scores and sample quantiles change earlier values on each refresh. The four weights and 0–100 mapping have no out-of-sample evidence.
- The UI uses a statically bundled legacy JSON file. A source failure or unavailable latest reading can be displayed as zero or given today's date. A Vercel Git rebuild was required for the file to change on the site. The existing production URL responded with HTTP 200, which establishes availability only.
- Neither audited branch contains a current GitHub workflow. The deleted workflow at `2e339b4` had the three event types, midnight UTC scheduling, no concurrency group or data quality gate, and an unrestricted staging command. Both READMEs describe an active daily feed and call the unofficial client an API integration.
- `main` has Next.js 16.2.2, React 19, Tailwind 4, Recharts 3 and a pnpm lockfile. `develop` has Next.js 15.5.9, Tailwind 3, Recharts 2, an npm lockfile, and build-error suppression. Both declare TypeScript strict mode. The refactor reconciles the framework upgrades with `src/`.

## Release plan and open evidence

Use the National Bureau of Statistics public releases for initial reconstruction. Its separate National Data query endpoint returned HTTP 403 during the probe. Validate article dates, statistical periods, labels and extraction against original responses. Official Google Trends API Alpha entitlement, comparable search coverage, Baidu redistribution authorization, and a lawful recurring recruitment series were unverified. A viable production source will need a raw archive, quality gate, coverage report and reproducible extraction before its values can enter the site.
