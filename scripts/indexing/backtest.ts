import { shiftMonth } from '../../src/lib/market/dates';
import type { Observation } from '../../src/lib/market/schema';
import { calibrate, mean, pmiPairs, standardize } from './model';
import { observationsFile, observationsSchema, readJson } from '../storage';

type Pair = [number, number];
type Model = 'persistence' | 'equal' | 'manufacturing_heavy' | 'nonmanufacturing_heavy' | 'pca';
const models: Model[] = ['persistence', 'equal', 'manufacturing_heavy', 'nonmanufacturing_heavy', 'pca'];

function moments(pairs: Pair[]) {
  const x = mean(pairs.map((pair) => pair[0]));
  const y = mean(pairs.map((pair) => pair[1]));
  if (x === null || y === null) return null;
  return {
    x, y,
    xx: pairs.reduce((sum, pair) => sum + (pair[0] - x) ** 2, 0),
    yy: pairs.reduce((sum, pair) => sum + (pair[1] - y) ** 2, 0),
    xy: pairs.reduce((sum, pair) => sum + (pair[0] - x) * (pair[1] - y), 0),
  };
}

function correlation(pairs: Pair[]) {
  const m = moments(pairs);
  return m && m.xx > 0 && m.yy > 0 ? m.xy / Math.sqrt(m.xx * m.yy) : null;
}

function pcaWeight(z: Pair[]) {
  const m = moments(z);
  if (!m || m.xy <= 0) return null;
  const eigenvalue = (m.xx + m.yy + Math.hypot(m.xx - m.yy, 2 * m.xy)) / 2;
  return m.xy / (m.xy + eigenvalue - m.xx);
}

function forecast(train: Pair[], predictor: number) {
  const m = moments(train);
  if (!m || m.xx === 0) return null;
  const slope = m.xy / m.xx;
  return { change: m.y + slope * (predictor - m.x), slope };
}

function summarize(rows: { actual: number; previous: number; prediction: number; slope: number | null }[]) {
  const mse = mean(rows.map((r) => (r.actual - r.prediction) ** 2));
  return {
    n: rows.length,
    mae: mean(rows.map((r) => Math.abs(r.actual - r.prediction))),
    rmse: mse === null ? null : Math.sqrt(mse),
    directional_accuracy: mean(rows.map((r) => Number(Math.sign(r.actual - r.previous) === Math.sign(r.prediction - r.previous)))),
    level_correlation: correlation(rows.map((r) => [r.prediction, r.actual])),
    slope_min: rows.some((r) => r.slope !== null) ? Math.min(...rows.flatMap((r) => r.slope ?? [])) : null,
    slope_max: rows.some((r) => r.slope !== null) ? Math.max(...rows.flatMap((r) => r.slope ?? [])) : null,
  };
}

export function backtest(rows: Observation[]) {
  const pmi = new Map(pmiPairs(rows).map((row) => [row.observation_period.start, row]));
  const national = new Map(rows.filter((row) => row.series_id === 'urban_unemployment').map((row) => [row.observation_period.start, row]));
  const cases = [...national.values()].flatMap((current) => {
    const month = current.observation_period.start;
    const priorMonth = shiftMonth(month, -1);
    const previous = national.get(priorMonth);
    const signal = pmi.get(priorMonth);
    if (!previous || previous.value === null || current.value === null ||
        !signal || signal.release_date >= previous.publication_date || current.publication_date <= previous.publication_date) return [];
    return [{
      month, forecast_date: previous.publication_date, actual: current.value, previous: previous.value,
      published: current.publication_date,
      signal, change: current.value - previous.value,
    }];
  }).sort((a, b) => a.month.localeCompare(b.month));

  const predictions = cases.flatMap((test, i) => {
    const past = cases.slice(0, i).filter((sample) => sample.published <= test.forecast_date);
    const manufacturing = calibrate(past.map((sample) => sample.signal.manufacturing));
    const nonmanufacturing = calibrate(past.map((sample) => sample.signal.nonmanufacturing));
    if (!manufacturing || !nonmanufacturing) return [];
    const score = (sample: typeof test): Pair => [
      standardize(sample.signal.manufacturing, manufacturing),
      standardize(sample.signal.nonmanufacturing, nonmanufacturing),
    ];
    const z = past.map(score);
    const pca = pcaWeight(z);
    if (pca === null) return [];
    const weights = { equal: 0.5, manufacturing_heavy: 2 / 3, nonmanufacturing_heavy: 1 / 3, pca };
    const components = score(test);
    const estimates = Object.entries(weights).flatMap(([model, weight]) => {
      const blend = ([a, b]: Pair) => weight * a + (1 - weight) * b;
      const estimate = forecast(z.map((pair, j) => [blend(pair), past[j].change]), blend(components));
      return estimate ? [[model, { prediction: test.previous + estimate.change, slope: estimate.slope }] as const] : [];
    });
    if (estimates.length !== models.length - 1) return [];
    return [{
      month: test.month,
      forecast_date: test.forecast_date,
      training_n: past.length,
      actual: test.actual,
      previous: test.previous,
      pca_manufacturing_weight: pca,
      models: Object.fromEntries([['persistence', { prediction: test.previous, slope: null }], ...estimates]) as
        Record<Model, { prediction: number; slope: number | null }>,
    }];
  });
  const lags = Array.from({ length: 7 }, (_, i) => i - 3).map((lag) => {
    const pairs = [...pmi.values()].flatMap((p): Pair[] => {
      const rate = national.get(shiftMonth(p.observation_period.start, lag))?.value;
      return rate === undefined || rate === null ? [] : [[(p.manufacturing + p.nonmanufacturing) / 2, rate]];
    });
    return { lag_months: lag, n: pairs.length, correlation: correlation(pairs) };
  });

  return {
    status: predictions.length ? 'exploratory_proxy_only' : 'insufficient_data',
    shadow_pressure: { status: 'insufficient_data', folds: 0 },
    eligible_cases: cases.length,
    metrics: Object.fromEntries(models.map((model) => [model, summarize(predictions.map((row) => ({
      actual: row.actual, previous: row.previous, ...row.models[model],
    })))])),
    descriptive_lags: lags,
    predictions,
  };
}

async function main() {
  const rows = observationsSchema.parse(await readJson(observationsFile));
  console.log(JSON.stringify(backtest(rows), null, 2));
}

if (process.argv.includes('--report')) void main();
