import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { mergeObservations, profile, uniqueRows } from '../../scripts/quality';
import { observationsSchema } from '../../scripts/storage';
import { observationSchema } from '../../src/lib/market/schema';

const rows = observationsSchema.parse(JSON.parse(readFileSync('data/processed/observations.json', 'utf8')));
const original = rows[0];
const updated = observationSchema.parse({
  ...original,
  value: 0.1,
  fetched_at: '2026-11-18T05:00:00.000Z',
});

it('rejects duplicate keys, zero variance and stale data', () => {
  expect(() => uniqueRows([original, original])).toThrow('Duplicate');
  expect(() => profile([original], '2026-11-17')).toThrow('zero-variance');
  expect(() => profile(rows, '2027-08-01')).toThrow('stale');
});

it('retains a previous vintage and is idempotent across retries', () => {
  const merged = mergeObservations([original], [updated], '2023-01-01');
  expect(merged.revisions[0].previous).toEqual(original);
  expect(merged.rows[0]).toMatchObject({ status: 'revised', value: 0.1, revision_id: merged.revisions[0].revision_id });
  expect(mergeObservations(merged.rows, [updated], '2023-01-01')).toEqual({ rows: merged.rows, revisions: [] });
  expect(mergeObservations(merged.rows, [original], '2023-01-01')).toEqual({ rows: merged.rows, revisions: [] });
});
