import { HISTORY_START, shiftMonth } from '../../src/lib/market/dates';
import { correlation, type vintageIndex } from './feature-selection';
import { mean } from './model';
import { activeModels, type ActiveModel, type rollingBacktest } from './multivariate-backtest';

type Folds = ReturnType<typeof rollingBacktest>['folds'];

function metrics(folds: Folds, model: ActiveModel) {
  const errors = folds.map((fold) => fold.forecasts[model].estimate - fold.actual);
  const mse = mean(errors.map((error) => error * error));
  return {
    n: folds.length, first: folds[0]?.month ?? null, last: folds.at(-1)?.month ?? null,
    mae: mean(errors.map(Math.abs)), rmse: mse === null ? null : Math.sqrt(mse),
    direction_accuracy: mean(folds.map(({ forecasts, actual, prior }) =>
      Number(Math.sign(Number((forecasts[model].estimate - prior).toFixed(10))) === Math.sign(Number((actual - prior).toFixed(10)))))),
    correlation: correlation(folds.map((fold) => fold.forecasts[model].estimate), folds.map((fold) => fold.actual)),
  };
}

function pairedMaeDifference(folds: Folds, model: ActiveModel) {
  const errors = folds.map(({ actual, forecasts }) =>
    Math.abs(forecasts[model].estimate - actual) - Math.abs(forecasts.M1.estimate - actual));
  const difference = mean(errors);
  if (difference === null || errors.length < 10) return { difference, interval: null };
  const centered = errors.map((error) => error - difference);
  const n = centered.length;
  const covariance = (lag: number) => centered.slice(lag).reduce((sum, error, i) => sum + error * centered[i], 0) / n;
  const variance = covariance(0) + 2 * (2 / 3 * covariance(1) + 1 / 3 * covariance(2));
  const margin = 1.96 * Math.sqrt(Math.max(0, variance) / n);
  return { difference, interval: [difference - margin, difference + margin] };
}

export function compareModels(folds: Folds) {
  const persistence = metrics(folds, 'M0').mae;
  const benchmark = metrics(folds, 'M1').mae;
  const midpoint = Math.ceil(folds.length / 2);
  return activeModels.map((model) => {
    const performance = metrics(folds, model);
    const halves = [folds.slice(0, midpoint), folds.slice(midpoint)];
    return {
      model, status: folds.length ? 'exploratory' : 'insufficient_data', ...performance,
      mae_improvement_vs_persistence: persistence && performance.mae !== null ? 1 - performance.mae / persistence : null,
      mae_improvement_vs_pmi: benchmark && performance.mae !== null ? 1 - performance.mae / benchmark : null,
      paired_mae_vs_pmi: pairedMaeDifference(folds, model),
      halves: halves.map((half) => metrics(half, model)),
    };
  });
}

const lagFeatures = ['construction_pmi_employment', 'services_pmi_employment', 'real_estate_starts_yoy', 'manufacturing_pmi_production'] as const;

export function describeLags(archive: ReturnType<typeof vintageIndex>, last: string) {
  return lagFeatures.flatMap((series_id) => [-3, -2, -1, 0, 1, 2, 3].map((lag) => {
    const pairs: { month: string; x: number; y: number }[] = [];
    for (let month = HISTORY_START; month <= last; month = shiftMonth(month, 1)) {
      const featureMonth = shiftMonth(month, -lag);
      if (featureMonth < HISTORY_START || featureMonth > last) continue;
      const x = archive.first(series_id, featureMonth)?.row.value;
      const y = archive.first('urban_unemployment', month)?.row.value;
      if (x != null && y != null) pairs.push({ month, x, y });
    }
    return { series_id, lag, n: pairs.length, first: pairs[0]?.month ?? null, last: pairs.at(-1)?.month ?? null,
      pearson: correlation(pairs.map((pair) => pair.x), pairs.map((pair) => pair.y)) };
  }));
}
