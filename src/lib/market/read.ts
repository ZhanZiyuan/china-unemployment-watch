import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { datasetSchema, healthSchema } from './schema';

async function readPublicFile(name: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), 'public', 'data', name), 'utf8')) as unknown;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function readMarketData() {
  const [dataset, health] = await Promise.all([readPublicFile('latest.json'), readPublicFile('collection-status.json')]);
  return {
    dataset: datasetSchema.nullable().parse(dataset),
    health: healthSchema.nullable().parse(health),
  };
}
