import { researchCatalog, type ResearchSeries } from '../../src/lib/market/research-catalog';
import { researchObservationSchema, type ResearchObservation } from '../../src/lib/market/schema';
import { sha256, type Original } from '../sources/http';
import type { ReleaseContent } from '../sources/nbs-release';

export function researchRow(
  original: Original, release: ReleaseContent, id: ResearchSeries,
  observation_period: ResearchObservation['observation_period'], value: number, evidence: string,
) {
  const metric = researchCatalog[id];
  return researchObservationSchema.parse({
    source_id: metric.source_id, source_url: original.meta.url, series_id: id,
    observation_period, frequency: metric.frequency, unit: metric.unit,
    value, status: value === 0 ? 'zero' : 'observed',
    publication_date: release.publicationDate, published_at: release.publishedAt,
    fetched_at: original.meta.fetched_at, raw_sha256: sha256(original.body), evidence, revision_id: null,
  });
}

export function exactMatch(text: string, pattern: RegExp): RegExpMatchArray | undefined {
  const matches = [...text.matchAll(pattern)];
  if (new Set(matches.map((m) => m[1])).size > 1) throw new Error(`Conflicting evidence for ${pattern.source}`);
  return matches[0];
}

export function releaseSignature(rows: ResearchObservation[]) {
  return JSON.stringify(rows.map(({ series_id, observation_period, value, publication_date, published_at, evidence }) =>
    ({ series_id, observation_period, value, publication_date, published_at, evidence })));
}
