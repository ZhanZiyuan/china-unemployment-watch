import { HISTORY_START, shiftMonth } from '../../src/lib/market/dates';
import { calibrate, mean, standardize } from './model';
import { localMidnight, selectFeatures, type vintageIndex } from './feature-selection';

export const horizons = ['nowcast', 'next_period'] as const;
export const activeModels = ['M0', 'M1', 'M2', 'M3', 'M4'] as const;
export type Horizon = typeof horizons[number];
export type ActiveModel = typeof activeModels[number];
type Archive = ReturnType<typeof vintageIndex>;
type Features = [manufacturing: number, nonmanufacturing: number, construction: number, services: number, starts: number, production: number];
type Case = { month: string; forecast_origin: string; outcome_available_at: string; actual: number; prior: number; x: Features };
const minTraining = 18;
const penalty = 1;
const featureNames = ['manufacturing_employment', 'nonmanufacturing_employment', 'construction_employment',
  'services_employment', 'property_starts_cumulative_yoy', 'manufacturing_production'] as const;

function cases(archive: Archive, last: string, horizon: Horizon) {
  const rows: Case[] = [];
  const exclusions = { target_unavailable: 0, prior_unavailable: 0, incomplete_features: 0 };
  for (let month = shiftMonth(HISTORY_START, 1); month <= last; month = shiftMonth(month, 1)) {
    const label = archive.first('urban_unemployment', month);
    if (label?.row.value == null) { exclusions.target_unavailable++; continue; }
    const forecast_origin = localMidnight(horizon === 'nowcast' ? `${month.slice(0, 8)}20` : month);
    if (label.available <= forecast_origin) throw new Error(`Official outcome already available at origin: ${month}`);
    const previous = shiftMonth(month, -1);
    let prior: number | null = null;
    for (let lag = 1; prior === null && shiftMonth(month, -lag) >= HISTORY_START; lag++) {
      prior = archive.asOf('urban_unemployment', shiftMonth(month, -lag), forecast_origin);
    }
    if (prior === null) { exclusions.prior_unavailable++; continue; }
    const x = [
      archive.asOf('manufacturing_pmi_employment', previous, forecast_origin),
      archive.asOf('nonmanufacturing_pmi_employment', previous, forecast_origin),
      archive.asOf('construction_pmi_employment', previous, forecast_origin),
      archive.asOf('services_pmi_employment', previous, forecast_origin),
      archive.asOf('real_estate_starts_yoy', shiftMonth(month, horizon === 'nowcast' ? -1 : -2), forecast_origin),
      archive.asOf('manufacturing_pmi_production', previous, forecast_origin),
    ];
    if (x.some((value) => value === null)) { exclusions.incomplete_features++; continue; }
    rows.push({ month, forecast_origin, outcome_available_at: label.available, actual: label.row.value, prior, x: x as Features });
  }
  return { rows, exclusions };
}

function dot(a: number[], b: number[]) {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

function fit(model: ActiveModel, train: Case[], target: Case) {
  if (model === 'M0') return { estimate: target.prior, intercept: 0, coefficients: {}, transforms: {}, dropped: [] };
  const sectors = model === 'M1' ? [0, 1] : [0, 2, 3];
  const indices = [...sectors, ...(model === 'M3' || model === 'M4' ? [4] : []), ...(model === 'M4' ? [5] : [])];
  const parameters = indices.map((index) => ({ index, parameters: calibrate(train.map((row) => row.x[index]), minTraining) }));
  const transform = (row: Case, index: number) => {
    const p = parameters.find((item) => item.index === index)?.parameters;
    return p ? standardize(row.x[index], p) : 0;
  };
  const split = (row: Case) => [
    ...(sectors.every((i) => parameters.find((p) => p.index === i)?.parameters)
      ? [{ name: 'sector_demand', value: mean(sectors.map((i) => transform(row, i))) ?? 0 }] : []),
    ...indices.slice(sectors.length).flatMap((index) => parameters.find((p) => p.index === index)?.parameters
      ? [{ name: featureNames[index], value: transform(row, index) }] : []),
  ];
  const vectors = train.map(split);
  const { kept, dropped } = selectFeatures(vectors[0].map(({ name }, i) => ({ name, values: vectors.map((row) => row[i].value) })));
  const y = train.map((row) => row.actual - row.prior);
  const yMean = mean(y) ?? 0;
  const centered = kept.map(({ name, values }) => {
    const center = mean(values) ?? 0;
    return { name, center, values: values.map((value) => value - center) };
  });
  // Cyclic coordinate descent on a strictly convex ridge objective with an unpenalized intercept.
  const beta = centered.map(() => 0);
  const residual = y.map((value) => value - yMean);
  for (let iteration = 0; iteration < 500; iteration++) {
    let change = 0;
    for (const [j, col] of centered.entries()) {
      const delta = (dot(col.values, residual) - penalty * beta[j]) / (dot(col.values, col.values) + penalty);
      beta[j] += delta;
      col.values.forEach((value, i) => { residual[i] -= value * delta; });
      change = Math.max(change, Math.abs(delta));
    }
    if (change < 1e-10) break;
  }
  const intercept = yMean - dot(beta, centered.map((column) => column.center));
  const values = new Map(split(target).map(({ name, value }) => [name, value]));
  return {
    estimate: target.prior + intercept + dot(beta, centered.map(({ name }) => values.get(name) ?? 0)),
    intercept,
    coefficients: Object.fromEntries(centered.map(({ name }, j) => [name, beta[j]])),
    transforms: Object.fromEntries(parameters.filter((p) => p.parameters).map(({ index, parameters: p }) => [featureNames[index], p])),
    dropped: [...dropped, ...parameters.filter((p) => !p.parameters).map(({ index }) => ({ name: featureNames[index], reason: 'zero_mad_or_insufficient' }))],
  };
}

export function rollingBacktest(archive: Archive, last: string, horizon: Horizon) {
  const { rows, exclusions } = cases(archive, last, horizon);
  const folds = rows.flatMap((target, i) => {
    const train = rows.slice(0, i).filter((row) => row.outcome_available_at < target.forecast_origin);
    if (train.length < minTraining) return [];
    return [{
      month: target.month, forecast_origin: target.forecast_origin, outcome_available_at: target.outcome_available_at,
      prior: target.prior, actual: target.actual, input: Object.fromEntries(featureNames.map((name, index) => [name, target.x[index]])),
      training_count: train.length, training_first: train[0].month, training_last: train.at(-1)!.month,
      forecasts: Object.fromEntries(activeModels.map((model) => [model, fit(model, train, target)])) as Record<ActiveModel, ReturnType<typeof fit>>,
    }];
  });
  return { folds, eligible_cases: rows.length, exclusions };
}
