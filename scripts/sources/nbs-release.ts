import { load } from 'cheerio';
import { businessDate, monthPeriod, shiftMonth } from '../../src/lib/market/dates';
import { definitions, observationSchema, type Observation, type SeriesId } from '../../src/lib/market/schema';
import { sha256, type Original } from './http';

const origin = 'https://www.stats.gov.cn';
export const archive = `${origin}/sj/zxfb/`;
const articlePath = /^\.\/(\d{6}\/t(\d{4})(\d{2})(\d{2})_\d+\.html)$/;
export const pmiTitle = /^(20\d{2})年(1[0-2]|[1-9])月中国采购经理指数运行情况$/;
const labourTitle = /^(?:20\d{2}年)?(?:[\d—–－-]+月份|一季度|上半年|前三季度)?(?:国民经济|经济运行|经济发展)(?!新动能)/;
export type Release = { suffix: string; listedDate: string; title: string; kind: 'nbs-labour' | 'nbs-pmi' };

export function classify(title: string): Release['kind'] | null {
  if (pmiTitle.test(title)) return 'nbs-pmi';
  if (labourTitle.test(title) && !/统计公报|最终核实/.test(title)) return 'nbs-labour';
  return null;
}

export function parseArchive(html: string) {
  const $ = load(html);
  const count = Number(/createPageHTML\((\d+),\s*\d+,\s*"index",\s*"html"\)/.exec(html)?.[1]);
  const releases = new Map<string, Release>();
  const dates: string[] = [];
  $('a.pc_1600[title][href]').each((_i, a) => {
    const path = articlePath.exec($(a).attr('href') ?? '');
    if (!path) return;
    const [, suffix, year, month, day] = path;
    const listedDate = `${year}-${month}-${day}`;
    dates.push(listedDate);
    const title = $(a).attr('title')?.trim() ?? '';
    const kind = classify(title);
    if (kind) releases.set(suffix, { suffix, listedDate, title, kind });
  });
  if (!dates.length || !Number.isInteger(count) || count < 1 || count > 500) {
    throw new Error('Official release archive markup is unavailable or changed');
  }
  return { count, oldest: dates.sort()[0], releases: [...releases.values()] };
}

export function releaseUrls(release: Release) {
  const urls = ['zwfwck/sjfb', 'sj/xwfbh/fbhwd', 'sj/zxfb', 'sj/zxfbhjd'].map((path) => `${origin}/${path}/${release.suffix}`);
  if (release.suffix === '202302/t20230203_1901737.html') {
    urls.push('https://app.www.gov.cn/govdata/gov/202302/01/496666/article.html');
  }
  return urls;
}

export function readRelease(original: Original, release: Release) {
  const $ = load(original.body.toString('utf8'));
  const normalize = (text: string) => text.normalize('NFKC').replace(/\s+/g, '');
  const title = normalize($('meta[name="ArticleTitle"]').attr('content') ?? $('title').text());
  if (!title.includes(normalize(release.title))) throw new Error('Response does not contain the listed title');
  const root = $('.detail-text-content .txt-content, #UCAP-CONTENT, .trs_editor_view, #content, #articleins').first();
  const text = normalize(root.text());
  if (!text) throw new Error('Official release body is missing');
  const dateTime = $('meta[name="PubDate"]').attr('content') ??
    $('.detail-text-content').prevAll().text().match(/20\d{2}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}/)?.[0] ??
    $('body').text().match(/20\d{2}[/-]\d{2}[/-]\d{2}\s+\d{2}:\d{2}/)?.[0];
  const pageDate = dateTime?.match(/(20\d{2})[/-](\d{2})[/-](\d{2})\s+(\d{2}:\d{2})/);
  const displayDate = $('body').text().match(/(?:发布时间[:：]\s*)?(20\d{2})-(\d{2})-(\d{2})\s+(?:来源|$)/m) ??
    $('body').text().match(/发布时间[:：]\s*(20\d{2})-(\d{2})-(\d{2})/);
  const date = pageDate ?? displayDate ?? $('.artlabel').text().match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (!date) throw new Error('Original publication date is missing');
  const publicationDate = `${date[1]}-${date[2]}-${date[3]}`;
  const publishedAt = pageDate ? new Date(`${publicationDate}T${pageDate[4]}:00+08:00`).toISOString() : null;
  return { $, root, text, normalize, publicationDate, publishedAt };
}

export type ReleaseContent = ReturnType<typeof readRelease>;

export function makeRow(
  original: Original, content: ReleaseContent, seriesId: SeriesId, year: number, month: number,
  value: number, evidence: string,
): Observation {
  const definition = definitions[seriesId];
  return observationSchema.parse({
    source_id: definition.source,
    source_url: original.meta.url,
    series_id: seriesId,
    observation_period: monthPeriod(year, month),
    frequency: definition.frequency,
    value,
    unit: definition.unit,
    status: value === 0 ? 'zero' : 'observed',
    fetched_at: original.meta.fetched_at,
    published_at: content.publishedAt,
    publication_date: content.publicationDate,
    raw_sha256: sha256(original.body),
    evidence,
    revision_id: null,
  });
}

export function previousReleaseMonth(publicationDate: string) {
  const month = shiftMonth(publicationDate, -1);
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

export function cutoffForRun(now: Date, backfill: boolean, initialEnd: string) {
  const day = businessDate(now);
  return backfill && day > initialEnd ? initialEnd : day;
}
