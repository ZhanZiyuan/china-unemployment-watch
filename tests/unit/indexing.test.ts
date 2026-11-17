import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { backtest } from '../../scripts/indexing/backtest';
import { calibrate, calibrationSchema, experimentalIndices, makeShadowIndex, standardize } from '../../scripts/indexing/model';
import { observationsSchema } from '../../scripts/storage';

const rows = observationsSchema.parse(JSON.parse(readFileSync('data/processed/observations.json', 'utf8')));
const calibration = calibrationSchema.parse(JSON.parse(readFileSync('data/metadata/pmi-calibration-v1.json', 'utf8')));

it('requires sufficient finite observations and nonzero MAD', () => {
  expect(calibrate([0, 1, 2])).toBeNull();
  expect(calibrate(Array.from({ length: 20 }, () => 2))).toBeNull();
  expect(calibrate([0, 1, Infinity], 3)).toBeNull();
  const fit = calibrate([0, 1, 2], 3);
  expect(fit).toEqual({ median: 1, scale: 1.4826, n: 3 });
  expect(standardize(999, fit!)).toBe(5);
});

it('retains earlier scores when later observations arrive and requires both categories', () => {
  const all = experimentalIndices(rows, calibration);
  const cutoff = '2025-01-01';
  const prior = experimentalIndices(rows.filter((r) => r.observation_period.start < cutoff), calibration);
  const demand = all.find((index) => index.id === 'employment_demand')!;
  expect(demand.values.filter((r) => r.observation_period.start < cutoff)).toEqual(prior.find((index) => index.id === 'employment_demand')!.values);
  expect(all.find((index) => index.id === 'shadow_pressure')).toMatchObject({ values: [], status: 'insufficient_data' });
  expect(makeShadowIndex([demand.values[0]], [demand.values[1]])).toEqual([]);
  expect(makeShadowIndex([demand.values[0]], [demand.values[0]])[0].value).toBe(0);
});

it('keeps earlier pseudo-real-time forecasts unchanged after adding future samples', () => {
  const cutoff = '2026-01-01';
  const past = backtest(rows.filter((r) => r.observation_period.start < cutoff));
  const all = backtest(rows);
  expect(past.predictions.length).toBeGreaterThan(0);
  expect(past.predictions).toEqual(all.predictions.filter((row) => row.month < cutoff));
  expect(all.shadow_pressure.folds).toBe(0);
});
