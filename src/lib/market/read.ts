import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { datasetSchema, healthSchema, manifestSchema } from './schema';

async function readPublicFile(name: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'public', 'data', name), 'utf8')) as unknown;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function readMarketData() {
  const [rawDataset, rawHealth, rawManifest] = await Promise.all([
    readPublicFile('latest.json'),
    readPublicFile('collection-status.json'),
    readPublicFile('manifest.json'),
  ]);
  const dataset = datasetSchema.nullable().parse(rawDataset);
  const manifest = manifestSchema.nullable().parse(rawManifest);
  if (dataset?.dataset_version !== manifest?.dataset_version) {
    throw new Error('Dataset and version manifest must come from the same publication');
  }
  return { dataset, manifest, health: healthSchema.nullable().parse(rawHealth) };
}
