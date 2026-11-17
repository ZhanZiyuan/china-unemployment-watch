import { describe, expect, it } from 'vitest';
import { businessDate, monthPeriod } from '../../src/lib/market/dates';
import { observationSchema } from '../../src/lib/market/schema';
import { fetchOriginal } from '../../scripts/sources/http';
import { parseLabour } from '../../scripts/sources/nbs-labour';
import { classify, parseArchive, type Release } from '../../scripts/sources/nbs-release';

const release: Release = {
  suffix: '202403/t20240318_0.html',
  title: '1—2月份国民经济',
  kind: 'nbs-labour',
  listedDate: '2024-03-18',
};
const url = 'https://www.stats.gov.cn/sj/zxfb/' + release.suffix;

function article(paragraph: string) {
  return {
    body: Buffer.from(`<meta name="PubDate" content="2024/03/18 10:00">
    <title>${release.title}</title><div class="trs_editor_view"><p>${paragraph}</p></div>`),
    meta: { url, fetched_at: '2024-03-18T03:00:00.000Z', status: 200 as const, content_type: 'text/html' },
  };
}

describe('native publication periods', () => {
  it('uses the Shanghai date across UTC midnight boundary and computes leap months', () => {
    expect(businessDate('2026-11-16T16:00:00.000Z')).toBe('2026-11-17');
    expect(monthPeriod(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('extracts the explicit month and keeps a source-reported zero', () => {
    const rows = parseLabour(article('1—2月份，全国城镇调查失业率平均值为5.0%。2月份，全国城镇调查失业率为0.0%。31个大城市城镇调查失业率为4.8%。'), release);
    expect(rows.map((r) => [r.series_id, r.value, r.status])).toEqual([
      ['urban_unemployment', 0, 'zero'], ['city_unemployment', 4.8, 'observed'],
    ]);
    expect(rows[0].published_at).toBe('2024-03-18T02:00:00.000Z');
    for (const invalid of [NaN, Infinity, null, -1]) {
      expect(observationSchema.safeParse({ ...rows[0], value: invalid }).success).toBe(false);
    }
  });

  it('rejects averages, access challenge pages and conflicting values', () => {
    expect(() => parseLabour(article('1—2月份，全国城镇调查失业率平均值为5.0%。'), release)).toThrow();
    expect(() => parseLabour(article('2月份，全国城镇调查失业率为4.9%。2月份，全国城镇调查失业率为5.0%。'), release)).toThrow();
    expect(() => parseArchive('<noscript>Please enable JavaScript</noscript>')).toThrow();
    expect(classify('上半年经济运行在合理区间 新动能快速成长')).toBe('nbs-labour');
  });
});

describe('public HTTP collection', () => {
  it('rejects HTTP failures and responses with an unrelated content type', async () => {
    await expect(fetchOriginal(url, 10, async () => new Response('', { status: 403 }))).rejects.toThrow('403');
    await expect(fetchOriginal(url, 10, async () => new Response('[]'))).rejects.toThrow('content type');
  });
  it('uses an abort signal for timeouts', async () => {
    await expect(fetchOriginal(url, 10, async (_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
      });
    })).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
