import { expect, it } from 'vitest';
import { businessDate, INITIAL_END } from '../../src/lib/market/dates';
import { researchDatasetSchema, researchObservationSchema } from '../../src/lib/market/schema';
import { replayPmi } from '../../scripts/research/replay';
import { replayResearch } from '../../scripts/research/collect-data';
import { makeResearchDataset, researchFile } from '../../scripts/research/publication';
import { propertyYearEndReleases, researchReleaseUrls } from '../../scripts/research/real-estate-year-end';
import { vintageIndex } from '../../scripts/indexing/feature-selection';
import { readJson } from '../../scripts/storage';

it('replays the construction and service PMI from exact monthly source bodies', { timeout: 30_000 }, async () => {
  const series = (await replayPmi()).filter((r) => r.publication_date <= INITIAL_END);
  const replayed = makeResearchDataset(series, { 'nbs-pmi': 'available' });
  expect(replayed.series.find((r) => r.series_id === 'construction_pmi_employment' &&
    r.observation_period.end === '2026-10-31')?.value).toBe(42);
  expect(replayed.coverage.find((c) => c.series_id === 'construction_pmi_activity')).toMatchObject({
    first: '2023-01-01', last: '2026-10-31', count: 46, missing: [],
  });
  expect(replayed.coverage.find((c) => c.series_id === 'manufacturing_pmi_production')).toMatchObject({ count: 46 });
  expect(researchObservationSchema.safeParse({ ...series[0], value: 101 }).success).toBe(false);
});

it('keeps original joint real-estate and annual survey periods in the warehouse', { timeout: 30_000 }, async () => {
  const snapshot = researchDatasetSchema.parse(await readJson(researchFile));
  const today = businessDate(new Date());
  const rows = (await replayResearch()).filter((row) => row.publication_date <= today && row.observation_period.end <= today);
  expect(makeResearchDataset(rows, snapshot.source_status)).toEqual(snapshot);
  expect(snapshot.source_status.financial).toBe('unconnected');
  const investment = snapshot.series.find((row) => row.series_id === 'real_estate_investment_yoy' &&
    row.observation_period.end === '2026-02-28');
  expect(investment).toMatchObject({
    observation_period: { start: '2026-01-01', end: '2026-02-28' },
    frequency: 'monthly', unit: 'percent', value: -11.1,
  });
  expect(researchObservationSchema.safeParse({
    ...investment, observation_period: { start: '2026-02-01', end: '2026-02-28' },
  }).success).toBe(false);
  const migrant = snapshot.series.find((row) => row.series_id === 'migrant_total' &&
    row.observation_period.end === '2025-12-31');
  expect(migrant).toMatchObject({
    frequency: 'yearly', value: 30115, unit: 'people_10k', publication_date: '2026-04-30',
  });
  expect(researchObservationSchema.safeParse({ ...migrant, frequency: 'monthly' }).success).toBe(false);

  const expected = [
    [2023, '2024-01-17', 95376, -20.4],
    [2024, '2025-01-17', 73893, -23],
    [2025, '2026-01-19', 58770, -20.4],
  ] as const;
  const archive = vintageIndex(rows);
  for (const [year, published, starts, growth] of expected) {
    const period = { start: `${year}-01-01`, end: `${year}-12-31` };
    const observations = snapshot.series.filter((row) => row.source_id === 'nbs-real-estate' && row.observation_period.end === period.end);
    expect(observations).toHaveLength(14);
    expect(new Set(observations.map((row) => row.series_id)).size).toBe(14);
    const allowed = researchReleaseUrls(propertyYearEndReleases.find((release) => release.title.startsWith(String(year)))!);
    for (const row of observations) {
      expect(row.observation_period).toEqual(period);
      expect(row.publication_date).toBe(published);
      expect(allowed).toContain(row.source_url);
    }
    expect(observations.find((row) => row.series_id === 'real_estate_starts_ytd')?.value).toBe(starts);
    expect(archive.asOf('real_estate_starts_yoy', period.end, `${published}T02:00:00.000Z`)).toBeNull();
    expect(archive.asOf('real_estate_starts_yoy', period.end, `${published}T02:00:00.001Z`)).toBe(growth);
  }
});

it('keeps each changed vintage and publishes only one value per series and period', { timeout: 30_000 }, async () => {
  const snapshots = await replayPmi();
  const first = snapshots.find((row) => row.series_id === 'construction_pmi_employment')!;
  const later = { ...first, fetched_at: '2026-12-01T00:00:00.000Z', value: first.value + 0.1 };
  const data = makeResearchDataset([later, first], { 'nbs-pmi': 'available' });
  expect(data.series).toEqual([later]);
  expect(data.revisions).toEqual([{ previous: first, replacement: later }]);
});
