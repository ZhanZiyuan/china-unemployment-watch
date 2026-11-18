import { expect, it } from 'vitest';
import { buildResearchModels, researchModelFile } from '../../scripts/indexing/multidimensional';
import { localMidnight, selectFeatures, vintageIndex } from '../../scripts/indexing/feature-selection';
import { readJson } from '../../scripts/storage';
import type { Observation } from '../../src/lib/market/schema';

it('defers date-only observations and retimed revisions until the evidence is available', () => {
  const row = {
    series_id: 'urban_unemployment', observation_period: { start: '2025-01-01', end: '2025-01-31' },
    frequency: 'monthly', value: 5.2, publication_date: '2025-02-16', published_at: null,
    fetched_at: '2025-02-16T10:00:00.000Z',
  } as Observation;
  const archive = vintageIndex([row, { ...row, value: 5.3, fetched_at: '2025-04-01T09:00:00.000Z' }]);
  expect(archive.asOf(row.series_id, '2025-01-01', localMidnight('2025-02-17'))).toBeNull();
  expect(archive.asOf(row.series_id, '2025-01-01', localMidnight('2025-02-18'))).toBe(5.2);
  expect(archive.asOf(row.series_id, '2025-01-01', localMidnight('2025-04-01'))).toBe(5.2);
  expect(archive.asOf(row.series_id, '2025-01-01', localMidnight('2025-04-02'))).toBe(5.3);
});

it('identifies constant and collinear features without reading holdout rows', () => {
  expect(selectFeatures([
    { name: 'sector', values: [1, 2, 3, 4] },
    { name: 'constant', values: [2, 2, 2, 2] },
    { name: 'duplicate', values: [8, 6, 4, 2] },
  ])).toMatchObject({
    kept: [{ name: 'sector' }],
    dropped: [{ name: 'constant', reason: 'zero_variance' }, { name: 'duplicate', reason: 'absolute_correlation_at_least_0.9' }],
  });
});

it('replays the research report and aligns candidate folds to publication time', async () => {
  const actual = await buildResearchModels();
  expect(actual).toEqual(await readJson(researchModelFile));
  for (const { folds, metrics } of Object.values(actual.evaluations)) {
    expect(folds.length).toBeGreaterThan(10);
    expect(metrics.every((metric) => metric.n === folds.length)).toBe(true);
    expect(folds.every((fold) => fold.training_last < fold.month && fold.outcome_available_at > fold.forecast_origin)).toBe(true);
    expect(folds.every((fold) => Object.values(fold.forecasts).every((forecast) =>
      Object.values(forecast.transforms).every((transform) => transform.n === fold.training_count)))).toBe(true);
  }
});
