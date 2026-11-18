import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { healthSchema, manifestSchema } from '../src/lib/market/schema';
import { healthFile, manifestFile } from './publish';
import { sha256 } from './sources/http';
import { researchModelFile } from './indexing/multidimensional';
import { researchFile, researchHealthFile } from './research/publication';
import { readJson } from './storage';

async function main() {
  const base = new URL(process.env.PRODUCTION_URL ?? 'https://cuwatch.vercel.app');
  if (base.protocol !== 'https:') throw new Error('Expected an HTTPS production URL');
  const manifest = manifestSchema.parse(await readJson(manifestFile));
  const health = healthSchema.parse(await readJson(healthFile));
  const researchFiles = [researchFile, researchModelFile, researchHealthFile];
  const files = [manifestFile, healthFile, ...researchFiles];
  const checks = await Promise.all(files.map(async (file) => {
    try {
      return { path: file.slice('public'.length), digest: sha256(await readFile(file)) };
    } catch (error) {
      if (file === researchHealthFile && (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }));
  const paths = [...checks.filter((check) => check !== null), { path: manifest.latest, digest: manifest.sha256 }];
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    try {
      await Promise.all(paths.map(async ({ path, digest }) => {
        const url = new URL(path, base);
        url.searchParams.set('check', `${Date.now()}-${attempt}`);
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: 'no-store' });
        if (!response.ok) throw new Error(`${response.status} ${path}`);
        if (sha256(Buffer.from(await response.arrayBuffer())) !== digest) throw new Error(`Production is serving another snapshot at ${path}`);
      }));
      console.log(`Online dataset ${manifest.dataset_version}, collection ${health.attempted_at} and research bytes verified.`);
      return;
    } catch (error) {
      console.log(`Deployment check ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (attempt < 24) await setTimeout(15_000);
  }
  throw new Error('Vercel did not serve the expected dataset and collection health before the deadline');
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
