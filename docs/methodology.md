# Index definition and validation

## Measures

- **Official Unemployment Rate.** NBS national urban surveyed unemployment, in percent. The 31-city rate is a separate official reference. Neither rate is used as an input to the index.
- **Employment Demand Index.** Experimental monthly measure of reported employment conditions in the NBS manufacturing and non-manufacturing PMI surveys. The survey measures directional change and does not count vacancies. Both components must be present for the same month.
- **Search Pressure Index.** Insufficient data. Its release requires search terms with documented geography, native granularity, stable scales across windows, and a frozen baseline. Exam-related search will be reported separately.
- **Shadow Employment Pressure Index.** Insufficient data. The candidate uses `(monthly search pressure Z − monthly employment demand Z) / 2` for matching periods. It requires both components, including comparable search evidence. No composite scores or composite backtest are published.

## Fixed PMI calibration

Version `pmi-demand-1.0.0` uses January 2023 through December 2024, with 24 observations per component. For a component value X, compute `clip((X − median) / (1.4826 × MAD), −5, 5)`. The medians and scale factors are 49.55 and 1.03782 for manufacturing, and 46.75 and 0.7413 for non-manufacturing. New calibrations require at least 18 finite observations and positive MAD. Clipping bounds the effect of extreme readings on the experimental aggregate. The observed PMI points remain in the publication.

The index is the arithmetic mean of the two standardized scores. Equal weight is a pre-specified reference with no outcome-driven optimization. Values are relative scale units. The proposed 0–100 transformation has been deferred. Neither this index nor the underlying unemployment series receives additional seasonal adjustment. PMI figures retain the source's seasonal adjustment. The available history provides only a few cycles for estimating Spring Festival, graduation and recruiting season effects.

`data/metadata/pmi-calibration-v1.json` freezes the parameters and baseline-input digest. Reproduce from the initial archived observations with `node --import tsx scripts/indexing/calibrate.ts --freeze-v1` in a checkout where the calibration file is absent. Daily extension never recalibrates the index. A confirmed source revision can change the affected score with the before/after inputs retained. Changes to the baseline, aggregation or transformation require a new algorithm version.

## Rolling-origin PMI proxy experiment

This pseudo-real-time exercise asks whether lagged PMI improves an estimate of the next available month's national unemployment rate. It uses the previous month's unemployment release date as the forecast origin. The predictor must have been published before that date. Only earlier eligible cases with known outcomes train each expanding fold. Cases spanning a missing month are excluded. Each training fold fits its own robust scales and a univariate regression on unemployment change. It compares persistence, equal PMI weights, two directional 2:1 sensitivity weights, and two-component PCA weights oriented toward demand. The latter three remain research comparisons. Twenty shared test cases between November 2024 and October 2026 remain after the 18-case minimum. Rates are from the official release archive, which is not an independently maintained point-in-time revision feed.

| Model | MAE (pp) | RMSE (pp) | Direction accuracy | Level correlation |
|---|---:|---:|---:|---:|
| Carry forward last rate | 0.1000 | 0.1183 | 20% | 0.518 |
| Equal weight PMI | 0.0960 | 0.1147 | 50% | 0.538 |
| Two-thirds manufacturing | 0.0928 | 0.1136 | 50% | 0.550 |
| Two-thirds non-manufacturing | 0.0989 | 0.1167 | 50% | 0.523 |
| PCA weights fit per fold | 0.0952 | 0.1144 | 50% | 0.541 |

The direction score counts an unchanged forecast as correct only for an unchanged observed rate. Equal-weight slopes ranged from −0.057 to −0.040 percentage points per score unit. Manufacturing PCA weights ranged from 41% to 70%. The largest descriptive level correlation over lags −3 to +3 was about 0.525 at lag −1, pairing PMI with unemployment from the preceding month. The +1-month correlation was about 0.063. Those level correlations are descriptive and may reflect seasonality or shared trends. The small test sample, model sensitivity, and limited vintage information do not establish predictive validity. A dynamic factor model and separate seasonal model would add parameters that the available span cannot support. The PMI index remains experimental and the shadow index has zero eligible folds.

Reproduce the comparison with `node --import tsx scripts/indexing/backtest.ts --report`. The committed [fold predictions and results](../data/processed/backtest-v1.json) record the initial evaluation snapshot.
