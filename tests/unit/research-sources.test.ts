import { expect, it } from 'vitest';
import { INITIAL_END } from '../../src/lib/market/dates';
import { researchDatasetSchema, researchObservationSchema } from '../../src/lib/market/schema';
import { replayPmi } from '../../scripts/research/replay';
import { makeResearchDataset, researchFile } from '../../scripts/research/publication';
import { readJson } from '../../scripts/storage';

it('replays the construction and service PMI from exact monthly source bodies', async () => {
  const series = (await replayPmi()).filter((r) => r.publication_date <= INITIAL_END);
  const snapshot = researchDatasetSchema.parse(await readJson(researchFile));
  const replayed = makeResearchDataset(series, { 'nbs-pmi': 'available' });
  expect(replayed.series).toEqual(snapshot.series.filter((r) => r.source_id === 'nbs-pmi'));
  expect(replayed.series.find((r) => r.series_id === 'construction_pmi_employment' &&
    r.observation_period.end === '2026-10-31')?.value).toBe(42);
  expect(replayed.coverage.find((c) => c.series_id === 'construction_pmi_activity')).toMatchObject({
    first: '2023-01-01', last: '2026-10-31', count: 46, missing: [],
  });
  expect(researchObservationSchema.safeParse({ ...series[0], value: 101 }).success).toBe(false);
});
