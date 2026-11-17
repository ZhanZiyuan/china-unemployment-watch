import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { datasetSchema, healthSchema, manifestSchema } from '../src/lib/market/schema';
import { dataFingerprint, healthFile, latestFile, manifestFile, preparePublication } from './publish';
import { readRevisions } from './quality';
import { sha256 } from './sources/http';
import { observationsFile, observationsSchema, readJson, readOptionalJson, writeJson } from './storage';

const schemas = {
  'latest.schema.json': datasetSchema,
  'manifest.schema.json': manifestSchema,
  'collection-status.schema.json': healthSchema,
};

async function main() {
  for (const [name, schema] of Object.entries(schemas)) {
    const path = `public/data/${name}`;
    const expected = z.toJSONSchema(schema);
    if (process.argv.includes('--write-schemas')) await writeJson(path, expected);
    if (!isDeepStrictEqual(await readJson(path), expected)) throw new Error(`Schema is out of date: ${path}`);
  }

  const bytes = await readFile(latestFile);
  const dataset = datasetSchema.parse(JSON.parse(bytes.toString()));
  const { dataset_version, series, ...rest } = dataset;
  const { generated_at: generatedAt, ...content } = rest;
  const manifest = manifestSchema.parse(await readJson(manifestFile));
  const rows = observationsSchema.parse(await readJson(observationsFile));
  const health = await readOptionalJson(healthFile);
  if (health !== undefined) {
    const status = healthSchema.parse(health);
    if (Date.parse(status.attempted_at) > Date.parse(status.completed_at)) throw new Error('Invalid collection time order');
  }
  if (!isDeepStrictEqual(series, rows)) throw new Error('Public observations differ from processed observations');
  const revisions = await readRevisions();
  const prepared = await preparePublication(rows, revisions, dataset.coverage.map((item) =>
    item.not_yet_published?.end ?? item.last ?? dataset.initial_end).sort().at(-1) ?? dataset.initial_end);
  if (prepared.changed || manifest.sha256 !== sha256(bytes) || manifest.dataset_version !== dataset_version ||
      manifest.algorithm_version !== dataset.algorithm_version || manifest.generated_at !== generatedAt ||
      manifest.observation_end !== dataset.observation_end || manifest.quality_status !== dataset.quality_status ||
      dataset_version !== dataFingerprint({ ...content, series: dataset.series })) {
    throw new Error('Dataset version or manifest does not match the verified publication');
  }
  console.log(`Verified ${series.length} official observations with raw replay and JSON schemas (${dataset_version.slice(0, 12)}).`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
