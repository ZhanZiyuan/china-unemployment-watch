import { monthPeriod } from '../../src/lib/market/dates';
import type { ResearchSeries } from '../../src/lib/market/research-catalog';
import type { Original } from '../sources/http';
import { readRelease, type Article } from '../sources/nbs-release';
import { exactMatch, researchRow } from './observations';

const estateTitle = /^(20\d{2})年(?:(?:1[-—–至－](1[01]|[2-9])月份)|(上半年)|(前三季度)|全年)?全国房地产(?:市场(?:基本|运行)情况|开发投资)/u;
const migrantTitle = /^(20\d{2})年农民工监测调查报告$/;
const constructionTitle = /^中华人民共和国(20\d{2})年国民经济和社会发展统计公报$/;
export const extensionKinds = ['nbs-real-estate', 'nbs-migrant', 'nbs-construction'] as const;
type ExtensionKind = typeof extensionKinds[number];
export type ResearchRelease = Article & { kind: ExtensionKind };

export function classifyResearch(article: Article): ResearchRelease | undefined {
  const title = article.title.normalize('NFKC').replace(/\s+/g, '');
  const candidates = [
    ['nbs-real-estate', estateTitle], ['nbs-migrant', migrantTitle], ['nbs-construction', constructionTitle],
  ] as const;
  for (const [kind, pattern] of candidates) {
    const match = pattern.exec(title);
    if (match && Number(match[1]) >= 2023) return { ...article, kind };
  }
}

const estateColumns = [
  ['real_estate_investment', /^(?:全国)?房地产开发投资(?:完成额)?\(亿元\)$/],
  ['real_estate_starts', /^房屋新开工面积\(万平方米\)$/],
  ['real_estate_construction', /^房屋施工面积\(万平方米\)$/],
  ['real_estate_completions', /^房屋竣工面积\(万平方米\)$/],
  ['real_estate_sales_area', /^(?:新建)?商品房销售面积\(万平方米\)$/],
  ['real_estate_sales_value', /^(?:新建)?商品房销售额\(亿元\)$/],
  ['real_estate_funds', /^房地产开发企业(?:本年)?到位资金\(亿元\)$/],
] as const;

function numeric(cell: string | undefined) {
  if (!cell) return undefined;
  const text = cell.replace(/,/g, '');
  return /^-?\d+(?:\.\d+)?$/.test(text) ? Number(text) : undefined;
}

function parseEstate(original: Original, release: ResearchRelease) {
  const content = readRelease(original, release);
  const title = estateTitle.exec(content.normalize(release.title));
  if (!title) throw new Error('No unambiguous year-to-date period');
  const year = Number(title[1]);
  const month = title[2] ? Number(title[2]) : title[3] ? 6 : title[4] ? 9 : 12;
  const period = { start: `${year}-01-01`, end: monthPeriod(year, month).end };
  const { $, root, normalize } = content;
  const table = root.find('table').toArray().map((table) => $(table).find('tr').toArray()
    .map((row) => $(row).children('td,th').toArray().map((cell) => normalize($(cell).text()))))
    .find((rows) => rows.some(([label, absolute, yoy]) =>
      label === '指标' && absolute === '绝对量' && /^(同比增长|比上年增长)\(%\)$/.test(yoy ?? '')));
  if (!table) throw new Error('Missing labeled real-estate development table');
  return estateColumns.flatMap(([id, label]) => {
    const matches = table.filter(([text]) => label.test(text));
    if (matches.length > 1) throw new Error(`Duplicate real-estate row: ${id}`);
    const [name, level, yoy] = matches[0] ?? [];
    return ([['ytd', level], ['yoy', yoy]] as const).flatMap(([type, entry]) => {
      const value = numeric(entry);
      return value === undefined ? [] : [researchRow(original, content, `${id}_${type}`, period, value, `${name} ${type} ${entry}`)];
    });
  });
}

const migrantFields: Partial<Record<ResearchSeries, RegExp>> = {
  migrant_total: /全国农民工总量(?:为)?(\d+)万人/gu,
  migrant_outbound: /(?:其中[,、]|[。;，,])外出农民工(?:为)?(\d+)万人/gu,
  migrant_local: /(?:[。;，,])本地农民工(?:为)?(\d+)万人/gu,
  migrant_urban: /年末在城镇居住的进城农民工(?:为)?(\d+)万人/gu,
  migrant_interprovincial: /在外出农民工中,跨省流动(\d+)万人/gu,
  migrant_construction_share: /从事建筑业占(\d+(?:\.\d+)?)%/gu,
  migrant_manufacturing_share: /从事制造业的农民工占(\d+(?:\.\d+)?)%/gu,
  migrant_monthly_income: /[。;]农民工月均收入(\d+)元/gu,
};

const constructionFields: Partial<Record<ResearchSeries, RegExp>> = {
  construction_value_added: /全年建筑业增加值(\d+)亿元/gu,
  construction_qualified_profits: /全国具有资质等级的总承包和专业承包建筑业企业(?:实现)?利润(?:总额)?(\d+)亿元/gu,
};

function parseAnnual(original: Original, release: ResearchRelease) {
  const content = readRelease(original, release);
  const migrant = release.kind === 'nbs-migrant';
  const match = (migrant ? migrantTitle : constructionTitle).exec(content.normalize(release.title));
  if (!match) throw new Error('Missing source-defined report year');
  const year = match[1];
  const period = { start: `${year}-01-01`, end: `${year}-12-31` };
  const paragraphs = content.root.find('p').toArray().map((p) => content.normalize(content.$(p).text())).join('。');
  return Object.entries(migrant ? migrantFields : constructionFields).flatMap(([id, pattern]) => {
    const found = exactMatch(paragraphs, pattern);
    return found ? [researchRow(original, content, id as ResearchSeries, period, Number(found[1]), found[0])] : [];
  });
}

export const parseExtendedRelease = (original: Original, release: ResearchRelease) =>
  release.kind === 'nbs-real-estate' ? parseEstate(original, release) : parseAnnual(original, release);
