import type { Original } from './http';
import { makeRow, pmiTitle, readRelease, type Release } from './nbs-release';

export function parsePmi(original: Original, release: Release) {
  const content = readRelease(original, release);
  const { $, root, normalize } = content;
  const title = pmiTitle.exec(release.title);
  if (!title) throw new Error('PMI title has no monthly period');
  const year = Number(title[1]);
  const month = Number(title[2]);
  const tables = root.find('table').toArray().map((table) => {
    return $(table).find('tr').toArray().map((row) =>
      $(row).children('td, th').toArray().map((cell) => normalize($(cell).text())));
  });
  const result = [];
  for (const [id, label] of [
    ['manufacturing_pmi_employment', '供应商配送时间'],
    ['nonmanufacturing_pmi_employment', '业务活动预期'],
  ] as const) {
    const table = tables.find((rows) => rows.some((cells) =>
      cells.includes('从业人员') && cells.includes(label)));
    if (!table) throw new Error(`Missing ${id} table`);
    const index = table.find((cells) => cells.includes('从业人员'))?.indexOf('从业人员') ?? -1;
    const points = table.flatMap((cells) => {
      const period = /^(20\d{2})年(1[0-2]|[1-9])月$/.exec(cells[0] ?? '');
      if (!period) return [];
      const value = cells[index];
      if (!/^\d{1,3}(?:\.\d+)?$/.test(value ?? '')) throw new Error(`Invalid ${id} cell for ${cells[0]}`);
      const y = Number(period[1]);
      const m = Number(period[2]);
      if (y < 2023 || y * 12 + m > year * 12 + month) return [];
      return [makeRow(original, content, id, y, m, Number(value), `${cells[0]} 从业人员 ${value}`)];
    });
    if (!points.some((row) => row.observation_period.start === `${year}-${String(month).padStart(2, '0')}-01`)) {
      throw new Error(`Missing current month in ${id} table`);
    }
    if (new Set(points.map((p) => p.observation_period.start)).size !== points.length) {
      throw new Error(`Duplicate month in ${id} table`);
    }
    result.push(...points);
  }
  return result;
}
