import { createHash } from 'node:crypto';
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

export async function fetchOriginal(url: string, timeout = 15_000, request: typeof fetch = fetch): Promise<Original> {
  const response = await request(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(timeout),
    headers: { Accept: 'text/html', 'User-Agent': 'ChinaUnemploymentWatch/1.0 (+https://github.com/ZhanZiyuan/china-unemployment-watch)' },
  });
  if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${url}`);
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
