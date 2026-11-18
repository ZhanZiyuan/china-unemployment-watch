import { releaseUrls } from '../sources/nbs-release';
import type { ResearchRelease } from './nbs-extended';

const origin = 'https://www.stats.gov.cn';
const yearEnd = [
  { year: 2023, suffix: '202401/t20240116_1946623.html', published: '2024-01-17', disclosure: '202401/t20240117_1946633.html' },
  { year: 2024, suffix: '202501/t20250117_1958328.html', published: '2025-01-17', disclosure: '202501/t20250117_1958328.html' },
  { year: 2025, suffix: '202601/t20260119_1962324.html', published: '2026-01-19', disclosure: '202601/t20260119_1962324.html' },
];

export const propertyYearEndReleases: ResearchRelease[] = yearEnd.map(({ year, suffix, published }) => ({
  kind: 'nbs-real-estate',
  title: `${year}年全国房地产市场基本情况`,
  suffix,
  listedDate: published,
}));

export function propertyYearEnd(release: ResearchRelease) {
  return release.kind === 'nbs-real-estate' ? yearEnd.find(({ suffix }) => suffix === release.suffix) : undefined;
}

export function researchReleaseUrls(release: ResearchRelease) {
  const target = propertyYearEnd(release);
  if (!target) return releaseUrls(release);
  return [...new Set([
    `${origin}/sj/zxfb/${target.suffix}`,
    `${origin}/xxgk/sjfb/zxfb2020/${target.disclosure}`,
    ...releaseUrls(release),
  ])];
}
