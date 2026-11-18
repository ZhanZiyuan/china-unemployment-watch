export const researchSources = ['nbs-pmi', 'nbs-real-estate', 'nbs-migrant', 'nbs-construction', 'financial'] as const;
export type ResearchSource = typeof researchSources[number];
export const categories = ['construction', 'real_estate', 'migrant', 'real_economy', 'financial'] as const;
export type ResearchCategory = typeof categories[number];

export const researchFrequencies = ['monthly', 'quarterly', 'yearly'] as const;
export const researchUnits = ['diffusion_points', 'percent', 'cny_100m', 'sqm_10k', 'people_10k', 'cny_per_month'] as const;
export type ResearchUnit = typeof researchUnits[number];

export type Metric = {
  source_id: ResearchSource;
  category: ResearchCategory;
  frequency: typeof researchFrequencies[number];
  metric_type: 'diffusion_index' | 'cumulative_value' | 'cumulative_yoy' | 'annual_count' | 'annual_flow' | 'annual_share' | 'annual_average';
  unit: ResearchUnit;
  geography: 'CN';
  population_scope: string;
  valid_range: readonly [number | null, number | null];
  publication_lag: string;
  seasonal_adjustment: 'publisher_adjusted' | 'as_reported';
};

function pmi(category: ResearchCategory, population: string): Metric {
  return {
    source_id: 'nbs-pmi', category, frequency: 'monthly', metric_type: 'diffusion_index', unit: 'diffusion_points',
    geography: 'CN', population_scope: population, valid_range: [0, 100],
    publication_lag: 'Usually near month-end; use the actual release timestamp.', seasonal_adjustment: 'publisher_adjusted',
  };
}

function estate(unit: ResearchUnit, comparison = false): Metric {
  return {
    source_id: 'nbs-real-estate', category: 'real_estate', frequency: 'monthly',
    metric_type: comparison ? 'cumulative_yoy' : 'cumulative_value', unit,
    geography: 'CN', population_scope: 'National real estate development enterprises covered by the NBS release',
    valid_range: [comparison ? -100 : 0, null],
    publication_lag: 'Following month; January and February are released jointly.', seasonal_adjustment: 'as_reported',
  };
}

function annual(source_id: 'nbs-migrant' | 'nbs-construction', unit: ResearchUnit, metric_type: Metric['metric_type'], population_scope: string): Metric {
  return {
    source_id, category: source_id === 'nbs-migrant' ? 'migrant' : 'construction', frequency: 'yearly',
    metric_type, unit, geography: 'CN', population_scope,
    valid_range: [0, unit === 'percent' ? 100 : null], publication_lag: 'After year-end; use the dated release.',
    seasonal_adjustment: 'as_reported',
  };
}

const migrantScope = 'National migrant-worker monitoring survey';
const estateYoy = () => estate('percent', true);

export const researchCatalog = {
  construction_pmi_activity: pmi('construction', 'Construction enterprises in the NBS nonmanufacturing PMI survey'),
  construction_pmi_orders: pmi('construction', 'Construction enterprises in the NBS nonmanufacturing PMI survey'),
  construction_pmi_employment: pmi('construction', 'Construction enterprises in the NBS nonmanufacturing PMI survey'),
  services_pmi_activity: pmi('real_economy', 'Service enterprises in the NBS nonmanufacturing PMI survey'),
  services_pmi_orders: pmi('real_economy', 'Service enterprises in the NBS nonmanufacturing PMI survey'),
  services_pmi_employment: pmi('real_economy', 'Service enterprises in the NBS nonmanufacturing PMI survey'),
  real_estate_investment_ytd: estate('cny_100m'),
  real_estate_investment_yoy: estateYoy(),
  real_estate_starts_ytd: estate('sqm_10k'),
  real_estate_starts_yoy: estateYoy(),
  real_estate_construction_ytd: estate('sqm_10k'),
  real_estate_construction_yoy: estateYoy(),
  real_estate_completions_ytd: estate('sqm_10k'),
  real_estate_completions_yoy: estateYoy(),
  real_estate_sales_area_ytd: estate('sqm_10k'),
  real_estate_sales_area_yoy: estateYoy(),
  real_estate_sales_value_ytd: estate('cny_100m'),
  real_estate_sales_value_yoy: estateYoy(),
  real_estate_funds_ytd: estate('cny_100m'),
  real_estate_funds_yoy: estateYoy(),
  migrant_total: annual('nbs-migrant', 'people_10k', 'annual_count', migrantScope),
  migrant_outbound: annual('nbs-migrant', 'people_10k', 'annual_count', 'Migrant workers employed outside their home township'),
  migrant_local: annual('nbs-migrant', 'people_10k', 'annual_count', 'Migrant workers employed within their home township'),
  migrant_urban: annual('nbs-migrant', 'people_10k', 'annual_count', 'Migrant workers living in urban areas at year-end'),
  migrant_interprovincial: annual('nbs-migrant', 'people_10k', 'annual_count', 'Out-of-town migrant workers crossing provincial boundaries'),
  migrant_construction_share: annual('nbs-migrant', 'percent', 'annual_share', migrantScope),
  migrant_manufacturing_share: annual('nbs-migrant', 'percent', 'annual_share', migrantScope),
  migrant_monthly_income: annual('nbs-migrant', 'cny_per_month', 'annual_average', migrantScope),
  construction_value_added: annual('nbs-construction', 'cny_100m', 'annual_flow', 'National construction sector value added at current prices'),
  construction_qualified_profits: annual('nbs-construction', 'cny_100m', 'annual_flow', 'Qualified general and specialist construction contractors'),
} satisfies Record<string, Metric>;

export type ResearchSeries = keyof typeof researchCatalog;
export const researchIds = Object.keys(researchCatalog) as ResearchSeries[];
