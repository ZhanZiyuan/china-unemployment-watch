# Year-end property release audit

The branch starts at main commit `ee500129a75075c4b759150bb75735d1b1de26b3`. Its 32 research series contain 944 observations under dataset version `c20df0998157db500c8ff625b8c42c6be656b448f1ffd35f6330e3d762cebdb2`. Each of the 14 property series is missing the periods ending December 31 in 2023, 2024 and 2025. The production sources remain official NBS HTML releases. The post-merge [collection run](https://github.com/ZhanZiyuan/china-unemployment-watch/actions/runs/44227299341) recorded zero current fetch errors and a partial property history.

The scheduled incremental collector's four-month window excludes all three gaps. Earlier attempts encountered access challenge pages. Fresh direct probes returned three complete NBS article bodies and the existing property table parser extracted 14 values from each. The 2023 news article URL contains January 16 while the article displays January 17 at 10:00 Shanghai time. Its information-disclosure companion uses a different article ID and template. It labels January 17 as the date of document formation and has no explicit publication time. Any fallback must pass the same publication-date and table checks as the news original. [2023 news article](https://www.stats.gov.cn/sj/zxfb/202401/t20240116_1946623.html) · [2023 disclosure companion](https://www.stats.gov.cn/xxgk/sjfb/zxfb2020/202401/t20240117_1946633.html)

Baseline lint, TypeScript, 23 tests, archived replay, model reproduction and production build passed.

## Evidence and validation

All three news articles returned HTTP 200 with `text/html`. The collector stored the received HTML bodies as gzip archives. A second, independently downloaded NBS information-disclosure table matched all 14 cells in each primary table. The accepted releases provide their original publication dates and times in the HTML. The records retain January 1 through December 31 as the observation period and use the NBS level and comparable-basis year-over-year columns.

| Observation year | Publication in Shanghai | Observations | SHA-256 of the original response |
|---|---|---:|---|
| [2023](https://www.stats.gov.cn/sj/zxfb/202401/t20240116_1946623.html) | 2024-01-17 10:00 | 14 | `4f25f2073d41f45127c3c60b0fa1c552f4dbc65698f5b897c1dbad8adfa57be3` |
| [2024](https://www.stats.gov.cn/sj/zxfb/202501/t20250117_1958328.html) | 2025-01-17 10:00 | 14 | `3c3aec5914c149e01ab22e594dd6b59ee45b0b98979aa71934a535af60e0df38` |
| [2025](https://www.stats.gov.cn/sj/zxfb/202601/t20260119_1962324.html) | 2026-01-19 10:00 | 14 | `193910cc11c03b6dc4d55b7e6812098433daf5d4f4c6b8612af324b31645cbb0` |

The 2023 report labels the two sales totals 商品房. The 2024 and 2025 reports label them 新建商品房. Their indicator explanations define sales through signed formal contracts for newly built commodity housing. The parser keeps the original row labels in evidence and reads the growth columns directly.

The 42 new rows bring the research snapshot to 986 observations and each property series to 42 reported periods. All original 944 observations match the audited snapshot exactly, there are no duplicate keys or numeric quality flags, and the 14 property series have no missing periods in the range after allowing for the combined January–February report. The replayed version is `f1a2c761376325989f7a67f85c59081c78f770ce659cdeeb511b21a744dedf27`. The repeat collection kept the release ledger and dataset version stable. The status of the property history is available. The source timestamps and checksums are in [the archive metadata](../data/metadata/research-releases.json).

`pnpm fetch-research --property-year-end` targets the three listed releases. The ordinary full backfill also includes these targets. The same URL policy applies during collection and replay. Existing archive evidence remains usable when a historical request fails. The 2023 information-disclosure copy supports the cross-check. Its document-formation date alone does not qualify as a publication timestamp.

## Rolling model comparison

The sector pressure series and the 19 same-month test folds are identical to the audited snapshot. The next-period comparison adds February 2025 and February 2026, when the previous December property values had already been published. January begins before the December reports are published and the next-period specification uses a two-month property lag. Unemployment outcomes and all input vintages continue to satisfy the published strict forecast-origin cutoff.

| Next-period model | Before, 16 observations | After, 18 observations | After on the original 16 months, MAE |
|---|---:|---:|---:|
| M0 persistence | 0.16250 / 0.19365 / 18.75% | 0.17222 / 0.20138 / 16.67% | 0.16250 |
| M1 headline PMI | 0.16321 / 0.18768 / 43.75% | 0.18058 / 0.20153 / 44.44% | 0.17178 |
| M2 sector PMI | 0.16728 / 0.19172 / 43.75% | 0.18703 / 0.20806 / 44.44% | 0.17697 |
| M3 property | 0.17734 / 0.19871 / 50.00% | 0.19370 / 0.21351 / 38.89% | 0.18570 |
| M4 manufacturing | 0.16240 / 0.18608 / 50.00% | 0.17522 / 0.19345 / 50.00% | 0.17062 |

The first two columns show MAE, RMSE and direction accuracy. Errors are percentage points. The additional reports changed both the training and test samples for the next-period evaluation. M3's MAE also rose on the original 16 test months with the updated training history. The evidence does not support promoting an enhanced index. [Recomputed held-out folds](../public/data/research-models.json)
