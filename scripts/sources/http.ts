import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';

export const sha256 = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export const responseMetadata = z.object({
  url: z.url(),
  fetched_at: z.iso.datetime(),
  status: z.literal(200),
  content_type: z.string().nullable(),
}).strict();
export type ResponseMetadata = z.infer<typeof responseMetadata>;
export type Original = { meta: ResponseMetadata; body: Buffer };

class HttpStatusError extends Error {
  constructor(readonly status: number, url: string) {
    super(`HTTP ${status}: ${url}`);
  }
}

const transientCodes = new Set([
  'EAI_AGAIN', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
]);

function nestedErrors(error: unknown): unknown[] {
  if (error instanceof AggregateError) return error.errors;
  return error instanceof Error && error.cause !== undefined ? [error.cause] : [];
}

export function errorDetails(error: unknown, depth = 0): string {
  if (!(error instanceof Error)) return String(error);
  const code = 'code' in error && typeof error.code === 'string' ? ` [${error.code}]` : '';
  const nested = depth < 3 ? nestedErrors(error).map((cause) => errorDetails(cause, depth + 1)) : [];
  return [`${error.message}${code}`, ...nested].join(' / ');
}

function isTransient(error: unknown, depth = 0): boolean {
  if (!(error instanceof Error) || depth > 3) return false;
  if (error instanceof HttpStatusError) return [408, 500, 502, 503, 504].includes(error.status);
  return error.name === 'TimeoutError' ||
    ('code' in error && typeof error.code === 'string' && transientCodes.has(error.code)) ||
    nestedErrors(error).some((cause) => isTransient(cause, depth + 1));
}

export async function retryOriginal(url: string, request: typeof fetchOriginal): Promise<Original> {
  for (const wait of [500, 1500]) {
    try {
      return await request(url);
    } catch (error) {
      if (!isTransient(error)) throw error;
      console.warn(`Retrying ${url} in ${wait} ms: ${errorDetails(error)}`);
      await delay(wait);
    }
  }
  return request(url);
}

export async function fetchOriginal(url: string, timeout = 15_000, request: typeof fetch = fetch): Promise<Original> {
  const response = await request(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(timeout),
    headers: { Accept: 'text/html', 'User-Agent': 'ChinaUnemploymentWatch/1.0 (+https://github.com/ZhanZiyuan/china-unemployment-watch)' },
  });
  if (response.status !== 200) throw new HttpStatusError(response.status, url);
  const contentType = response.headers.get('content-type');
  if (!contentType?.toLowerCase().startsWith('text/html')) throw new Error(`Unexpected content type: ${url}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`Empty response body: ${url}`);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 5_000_000) throw new Error(`Response exceeds 5 MB: ${url}`);
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  if (!length) throw new Error(`Empty response body: ${url}`);
  return { meta: { url, fetched_at: new Date().toISOString(), status: 200, content_type: contentType }, body: Buffer.concat(chunks) };
}
