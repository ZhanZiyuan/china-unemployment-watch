import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { observationSchema } from '../src/lib/market/schema';
import { responseMetadata, sha256, type Original } from './sources/http';

export const observationsFile = 'data/processed/observations.json';
export const observationsSchema = z.array(observationSchema);

export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

export async function writeAtomic(path: string, bytes: string | Buffer) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}

export const writeJson = (path: string, data: unknown) => writeAtomic(path, `${JSON.stringify(data, null, 2)}\n`);

export const rawPath = (hash: string) => `data/raw/${hash}.html.gz`;
export const rawMetadataPath = (hash: string) => `data/metadata/${hash}.json`;

export async function storeOriginal(original: Original, hash: string) {
  if (sha256(original.body) !== hash) throw new Error(`Invalid original digest: ${hash}`);
  await writeFile(rawPath(hash), gzipSync(original.body), { flag: 'wx' }).catch(rethrowExceptExists);
  await writeFile(rawMetadataPath(hash), `${JSON.stringify(original.meta, null, 2)}\n`, { flag: 'wx' }).catch(rethrowExceptExists);
}

function rethrowExceptExists(error: unknown) {
  if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
}

export async function readOriginal(hash: string): Promise<Original> {
  const [gzip, metadata] = await Promise.all([readFile(rawPath(hash)), readJson(rawMetadataPath(hash))]);
  const body = gunzipSync(gzip);
  if (sha256(body) !== hash) throw new Error(`Original digest mismatch: ${hash}`);
  return { body, meta: responseMetadata.parse(metadata) };
}
