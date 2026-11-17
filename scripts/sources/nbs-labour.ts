import type { Original } from './http';
import { makeRow, previousReleaseMonth, readRelease, type Release } from './nbs-release';

export function parseLabour(original: Original, release: Release) {
  const content = readRelease(original, release);
  const { year, month } = previousReleaseMonth(content.publicationDate);
  const split = (text: string) => text.split(/(?<=[。;])/);
  const paragraphs = content.root.find('p').toArray().map((p) => split(content.normalize(content.$(p).text())));
  const rows = [];
  for (const [id, name] of [
    ['urban_unemployment', '全国城镇调查失业率'],
    ['city_unemployment', '31个大城市城镇调查失业率'],
  ] as const) {
    const expression = new RegExp(`${name}(?:为|是|降至|上升至|升至)?(\\d+(?:\\.\\d+)?)%`);
    const period = new RegExp(`(?:^|[^\\d—–\\-至])${month}月份?[,、]?`);
    const candidates = paragraphs.flatMap((segments) => segments.flatMap((segment, index) => {
      const match = expression.exec(segment);
      if (!match) return [];
      const prefix = segment.slice(0, match.index);
      const explicit = period.test(prefix);
      const followsMonthly = id === 'city_unemployment' && !/平均|(?:\d+[-—至]\d+)月/.test(prefix) &&
        segments.slice(0, index + 1).some((s) =>
          period.test(s) && /全国城镇调查失业率(?:为|是|降至|上升至|升至)?\d/.test(s));
      return explicit || followsMonthly ? [match] : [];
    }));
    const values = [...new Set(candidates.map((match) => Number(match[1])))];
    if (values.length > 1) throw new Error(`Conflicting ${id} statements in release`);
    if (values.length === 1) rows.push(makeRow(original, content, id, year, month, values[0], candidates[0][0]));
  }
  if (!rows.some((row) => row.series_id === 'urban_unemployment')) throw new Error('No unambiguous monthly national rate');
  return rows;
}
