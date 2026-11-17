import { businessDate, HISTORY_START, INITIAL_END } from '../src/lib/market/dates';
import { datasetSchema, manifestSchema, type Dataset, type Observation } from '../src/lib/market/schema';
import { profile, validateEvidence, type Revision } from './quality';
import { sha256 } from './sources/http';
import { readJson, readOptionalJson, writeAtomic, writeJson } from './storage';
import { ALGORITHM_VERSION, calibrationSchema, experimentalIndices } from './indexing/model';
import { calibrationFile } from './indexing/calibrate';

export const latestFile = 'public/data/latest.json';
export const manifestFile = 'public/data/manifest.json';
export const healthFile = 'public/data/collection-status.json';

export function dataFingerprint(dataset: Omit<Dataset, 'dataset_version' | 'generated_at'>) {
  return sha256(JSON.stringify(dataset, (_key, value: unknown) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  }));
}

export async function preparePublication(rows: Observation[], revisions: Revision[], asOf: string) {
  await validateEvidence(rows, revisions);
  const quality = profile(rows, asOf);
  const calibration = calibrationSchema.parse(await readJson(calibrationFile));
  const indices = experimentalIndices(rows, calibration);
  const content = {
    schema_version: '1.0.0',
    algorithm_version: ALGORITHM_VERSION,
    time_zone: 'Asia/Shanghai',
    observation_start: HISTORY_START,
    observation_end: rows.filter((row) => row.value !== null).map((row) => row.observation_period.end).sort().at(-1) ?? null,
    initial_end: INITIAL_END,
    quality_status: quality.coverage.some((item) => item.missing.length) ? 'partial_coverage' : 'passed',
    ...quality,
    series: rows,
    indices,
    revision_count: revisions.length,
  } as const;
  const dataset_version = dataFingerprint(content);
  const saved = await readOptionalJson(latestFile);
  const existing = saved === undefined ? null : datasetSchema.parse(saved);
  if (existing?.dataset_version === dataset_version) return { dataset: existing, changed: false };
  const dataset = datasetSchema.parse({ ...content, dataset_version, generated_at: new Date().toISOString() });
  return { dataset, changed: true };
}

export async function publish(dataset: Dataset) {
  const bytes = `${JSON.stringify(dataset, null, 2)}\n`;
  const manifest = manifestSchema.parse({
    schema_version: dataset.schema_version,
    dataset_version: dataset.dataset_version,
    algorithm_version: dataset.algorithm_version,
    generated_at: dataset.generated_at,
    observation_start: dataset.observation_start,
    observation_end: dataset.observation_end,
    quality_status: dataset.quality_status,
    latest: '/data/latest.json',
    health: '/data/collection-status.json',
    sha256: sha256(bytes),
  });
  await writeAtomic(latestFile, bytes);
  await writeJson(manifestFile, manifest);
  console.log(`Validated dataset ${dataset.dataset_version} at ${businessDate(dataset.generated_at)} (${dataset.series.length} observations).`);
}
