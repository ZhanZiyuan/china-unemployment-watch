# Multidimensional employment pressure study

## Tasks and archived evidence

The monthly exploratory sector pressure score, descriptive correlations, same-month estimates and next-period estimates are distinct outputs. The published baseline remains `pmi-demand-1.0.0`. The research score is `sector-pressure-1.0.0`, and its calibration and research JSON are versioned separately. Neither GDP contributions nor unemployment headcounts are estimated.

The score reverses the sign of the equal-weight average of manufacturing, construction and services PMI employment robust z-scores. Each component uses median and 1.4826 × median absolute deviation from January 2023 through December 2024, with 18 usable months minimum. Each z-score is capped at ±5. A missing component leaves the month unscored. The frozen release archive digest and parameters are in `data/metadata/multidimensional-calibration-v1.json`. Scores in the calibration window are retrospective. Larger numbers indicate weaker surveyed staffing. This is a standardized score with no percent unit. The official unemployment rate is a separate outcome. The surveys supply their published adjustment, and the study fits no further seasonal model.

For forecast evaluation, only dated original evidence strictly before the forecast origin is eligible. For an article carrying only a date, availability starts at the following midnight in China. For values changed under the same release date, the distinct body must have been retrieved before use, and archived versions are retained. Targets use the first evidenced national urban surveyed unemployment value. Monthly model cases are reconstructed from their own origins before training. These are retrospective simulations using available release archives, with incomplete real-time vintages for some dates. Annual observations are used only to examine sector structure.

## Model specification and testing

| ID | Method |
|---|---|
| M0 | Persistence of the most recent officially available unemployment rate. |
| M1 | M0 plus a ridge adjustment based on equal-weight standardized manufacturing and nonmanufacturing employment PMI. This fold-specific benchmark uses the baseline specification and has no effect on the published baseline. |
| M2 | M0 plus equal-weight standardized manufacturing, construction and services employment PMI. Removing aggregate nonmanufacturing PMI prevents overlap with the two sector components. |
| M3 | M2 with one property feature, comparable-basis cumulative year-over-year growth in new starts. Preserving the original January-to-end period keeps joint January–February data intact. |
| M4 | M3 with manufacturing PMI production. |
| M5 | Financial model unavailable pending a licensed, verified dataset. |

Same-month estimates are made at 00:00 Shanghai on the 20th of the target month. They use prior-month PMI and property releases if already eligible. The next-period decision is made at 00:00 on the first day of its target month, immediately after the prior month closes. It uses prior-month PMI and the property release ending two months before the target, where available. M0 may need an earlier release when the immediately preceding outcome is unavailable. Missing exact PMI or property inputs exclude the case for all models in that horizon.

Each expanding training window contains at least 18 common earlier eligible months with outcomes published strictly before the forecast origin. Centering, scaling and feature selection are fitted on that window. Zero-MAD features are excluded. A later feature with absolute Pearson correlation of 0.9 or higher against a retained column is excluded. The sector aggregate comes first, then property and production. Ridge uses the fixed sum-of-squares penalty of 1 on coefficients and an unpenalized intercept. Its target is the difference from persistence. The three-feature cap avoids fitting many correlated property proxies. No seasonal effects, elastic net, PCA, dynamic factor model or tuned hyperparameters were fitted in this release. The public report records each held-out forecast, actual outcome, input, train range and size, fitted transforms, exclusions, intercept and coefficients.

MAE and RMSE are in percentage points. Direction accuracy compares the sign of the predicted and realized change from the available persistence value. An exactly flat move is a third category. Pearson correlation uses forecasts versus outcomes on identical held-out months. Stability uses early and late test halves and reported per-fold coefficients. Approximate paired intervals on absolute error differences against M1 use Bartlett-weighted lag-2 serial covariance and a normal 95% multiplier. Excluded months make this an observed-case interval and the small sample makes it descriptive. The separate ±3-month Pearson analysis compares first-reported levels on shared observation months and records its sample and range. Positive lag means the feature period was earlier. Publication-constrained prediction is assessed only in the rolling backtests.

## Initial actual results

| Model | Same month MAE | RMSE | Direction | Next period MAE | RMSE | Direction |
|---|---:|---:|---:|---:|---:|---:|
| M0 | 0.1000 | 0.1192 | 21.1% | 0.1625 | 0.1936 | 18.8% |
| M1 | 0.0962 | 0.1151 | 52.6% | 0.1632 | 0.1877 | 43.8% |
| M2 | 0.0995 | 0.1170 | 52.6% | 0.1673 | 0.1917 | 43.8% |
| M3 | 0.0985 | 0.1163 | 52.6% | 0.1773 | 0.1987 | 50.0% |
| M4 | 0.0974 | 0.1161 | 57.9% | 0.1624 | 0.1861 | 50.0% |
| M5 | Unavailable | | | Unavailable | | |

Same month has 19 held-out cases between November 2024 and October 2026, from 37 eligible cases. Next period has 16 between April 2025 and October 2026, from 34 eligible cases. Candidate eligibility omitted four same-month cases and six next-period cases due to missing required feature observations or publication timing. The next-period M4 improvement over M1 is about 0.00081 percentage points of MAE. Its approximate paired interval is −0.0226 to +0.0210, and its early-half MAE is 0.1932 versus M1's 0.1856. Late-half MAE is 0.1316 versus 0.1408. Next-period correlations range from −0.55 to −0.44 across M0–M4. M2 and M3 increased next-period error versus M1. The review found no stable incremental forecasting value and retains the existing benchmark. Same-month level correlations for construction staffing (0.35, 42 pairs), service staffing (0.28, 42), new starts (0.23, 39) and manufacturing production (0.26, 42) are exploratory associations. Short series, revised denominators, incomplete sources and publication lag constrain interpretation.

[Out-of-sample folds and metrics](../public/data/research-models.json) · [Research series and their provenance](multidimensional-data.md)

## Year-end property update

The [year-end backfill](real-estate-year-end.md) restored 42 verified observations without changing the existing model definitions. Its report compares the original and recomputed folds and the original 16 test months. The current downloadable model artifact uses the recomputed sample.
