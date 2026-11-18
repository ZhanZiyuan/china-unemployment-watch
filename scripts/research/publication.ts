import { endOfMonth, HISTORY_START, shiftMonth } from '../../src/lib/market/dates';
import { researchCatalog, researchIds } from '../../src/lib/market/research-catalog';
import { researchDatasetSchema, researchKey, type ResearchDataset, type ResearchObservation } from '../../src/lib/market/schema';
import { sha256 } from '../sources/http';

export const researchFile = 'public/data/research.json';

export function makeResearchDataset(vintages: ResearchObservation[], source_status: ResearchDataset['source_status']) {
  source_status = { ...source_status, financial: 'unconnected' };
  const latest = new Map<string, ResearchObservation>();
  for (const row of [...vintages].sort((a, b) => a.publication_date.localeCompare(b.publication_date) || a.fetched_at.localeCompare(b.fetched_at))) {
    const key = researchKey(row);
    const prior = latest.get(key);
    if (prior?.publication_date === row.publication_date && prior.value === row.value) continue;
    latest.set(key, row);
  }
  const series = [...latest.values()].sort((a, b) => researchKey(a).localeCompare(researchKey(b)));
  const coverage = researchIds.map((series_id) => {
    const rows = series.filter((row) => row.series_id === series_id);
    const first = rows[0]?.observation_period.start ?? null;
    const last = rows.at(-1)?.observation_period.end ?? null;
    const dates = new Set(rows.map((row) => row.observation_period.end));
    const missing = [];
    const metric = researchCatalog[series_id];
    const step = { monthly: 1, quarterly: 3, yearly: 12 }[metric.frequency];
    for (let month = shiftMonth(HISTORY_START, step - 1); last && month <= last; month = shiftMonth(month, step)) {
      if (metric.metric_type.startsWith('cumulative_') && month.endsWith('-01-01')) continue;
      const end = endOfMonth(month);
      if (!dates.has(end)) missing.push(end);
    }
    return { series_id, count: rows.length, first, last, missing };
  });
  return researchDatasetSchema.parse({
    schema_version: 'research-1.0.0', dataset_version: sha256(JSON.stringify({ series, coverage, source_status })),
    series, coverage, source_status,
  });
}
