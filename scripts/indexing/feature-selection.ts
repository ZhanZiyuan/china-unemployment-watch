import type { Observation, ResearchObservation } from '../../src/lib/market/schema';
import { shiftDay } from '../../src/lib/market/dates';
import { mean } from './model';

type Evidence = Observation | ResearchObservation;

export function localMidnight(day: string) {
  return new Date(`${day}T00:00:00+08:00`).toISOString();
}

export function publicationTime(row: Evidence) {
  return row.published_at ?? localMidnight(shiftDay(row.publication_date, 1));
}

export function vintageIndex(rows: Evidence[]) {
  const periods = new Map<string, { row: Evidence; available: string }[]>();
  const dated = [...rows].sort((a, b) =>
    a.publication_date.localeCompare(b.publication_date) || a.fetched_at.localeCompare(b.fetched_at));
  for (const row of dated) {
    if (row.value === null || row.frequency !== 'monthly') continue;
    const key = `${row.series_id}/${row.observation_period.end.slice(0, 7)}`;
    const previous = periods.get(key) ?? [];
    const sameRelease = previous.find((vintage) => vintage.row.publication_date === row.publication_date);
    if (previous.at(-1)?.row.value === row.value) continue;
    // A changed body with the same official date proves the revision only as of acquisition.
    const available = sameRelease ? row.fetched_at : publicationTime(row);
    previous.push({ row, available });
    periods.set(key, previous);
  }
  const ordered = (series: Evidence['series_id'], month: string) =>
    [...periods.get(`${series}/${month.slice(0, 7)}`) ?? []].sort((a, b) => a.available.localeCompare(b.available));
  return {
    first: (series: Evidence['series_id'], month: string) => ordered(series, month)[0],
    asOf: (series: Evidence['series_id'], month: string, origin: string) =>
      ordered(series, month).findLast((vintage) => vintage.available < origin)?.row.value ?? null,
  };
}

export function correlation(x: number[], y: number[]) {
  const a = mean(x);
  const b = mean(y);
  if (x.length !== y.length || x.length < 3 || a === null || b === null) return null;
  const square = (values: number[], center: number) => values.reduce((sum, value) => sum + (value - center) ** 2, 0);
  const scale = Math.sqrt(square(x, a) * square(y, b));
  return scale > 0
    ? Math.max(-1, Math.min(1, x.reduce((sum, value, i) => sum + (value - a) * (y[i] - b), 0) / scale))
    : null;
}

export function selectFeatures(columns: { name: string; values: number[] }[]) {
  const kept: typeof columns = [];
  const dropped: { name: string; reason: string }[] = [];
  for (const column of columns) {
    if (correlation(column.values, column.values) === null) {
      dropped.push({ name: column.name, reason: 'zero_variance' });
    } else if (kept.some((other) => Math.abs(correlation(column.values, other.values) ?? 0) >= 0.9)) {
      dropped.push({ name: column.name, reason: 'absolute_correlation_at_least_0.9' });
    } else {
      kept.push(column);
    }
  }
  return { kept, dropped };
}
