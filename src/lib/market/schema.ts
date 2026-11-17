import { z } from 'zod';
import { businessDate, endOfMonth, HISTORY_START, shiftDay } from './dates';

export const sources = ['nbs-labour', 'nbs-pmi', 'google-trends', 'baidu-index', 'recruitment'] as const;
export const frequencySchema = z.enum(['daily', 'weekly', 'monthly']);
export const statusSchema = z.enum([
  'observed', 'zero', 'missing', 'not_yet_published', 'fetch_failed',
  'invalid', 'suppressed', 'not_applicable', 'revised',
]);
export const definitions = {
  urban_unemployment: { source: 'nbs-labour', frequency: 'monthly', unit: 'percent' },
  city_unemployment: { source: 'nbs-labour', frequency: 'monthly', unit: 'percent' },
  manufacturing_pmi_employment: { source: 'nbs-pmi', frequency: 'monthly', unit: 'diffusion_points' },
  nonmanufacturing_pmi_employment: { source: 'nbs-pmi', frequency: 'monthly', unit: 'diffusion_points' },
} as const;
export type SeriesId = keyof typeof definitions;
export type SourceId = typeof sources[number];

export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const periodSchema = z.object({ start: z.iso.date(), end: z.iso.date() }).strict();
const nbsUrl = z.url().refine((url) => {
  const u = new URL(url);
  return u.protocol === 'https:' && (
    (u.hostname === 'www.stats.gov.cn' && /^\/(?:sj|zwfwck|zt_18555|xxgk)\//.test(u.pathname)) ||
    (u.hostname === 'app.www.gov.cn' && u.pathname.startsWith('/govdata/gov/'))
  ) && !u.username && !u.password && !u.port;
}, 'Expected an official NBS release or its State Council mirror');

export const observationSchema = z.object({
  source_id: z.enum(['nbs-labour', 'nbs-pmi']),
  source_url: nbsUrl,
  series_id: z.enum(['urban_unemployment', 'city_unemployment', 'manufacturing_pmi_employment', 'nonmanufacturing_pmi_employment']),
  observation_period: periodSchema,
  frequency: frequencySchema,
  value: z.number().min(0).max(100).nullable(),
  unit: z.enum(['percent', 'diffusion_points']),
  status: statusSchema,
  fetched_at: z.iso.datetime(),
  published_at: z.iso.datetime().nullable(),
  publication_date: z.iso.date(),
  raw_sha256: digestSchema,
  evidence: z.string().min(1).max(240),
  revision_id: digestSchema.nullable(),
}).strict().superRefine((row, ctx) => {
  const definition = definitions[row.series_id];
  const { start, end } = row.observation_period;
  const observed = ['observed', 'zero', 'revised'].includes(row.status);
  const correctPeriod = {
    monthly: start.endsWith('-01') && endOfMonth(start) === end,
    weekly: shiftDay(start, 6) === end,
    daily: end === start && end < businessDate(row.fetched_at),
  }[row.frequency];
  if (row.source_id !== definition.source || row.unit !== definition.unit || row.frequency !== definition.frequency ||
      start < HISTORY_START || start > end ||
      row.publication_date > businessDate(row.fetched_at) || row.publication_date < (row.source_id === 'nbs-pmi' ? start : end) ||
      (row.published_at && (businessDate(row.published_at) !== row.publication_date || Date.parse(row.published_at) > Date.parse(row.fetched_at))) ||
      !correctPeriod ||
      observed !== (row.value !== null) || (row.value === 0 && !['zero', 'revised'].includes(row.status)) ||
      (row.status === 'zero' && row.value !== 0) || ((row.status === 'revised') !== (row.revision_id !== null))) {
    ctx.addIssue({ code: 'custom', message: 'Inconsistent source, value, dates, statistical period, or revision' });
  }
});

export type Observation = z.infer<typeof observationSchema>;
export const observationKey = (row: Observation) => `${row.source_id}/${row.series_id}/${row.observation_period.start}`;
