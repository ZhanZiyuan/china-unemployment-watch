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

export const researchCatalog = {
  construction_pmi_activity: pmi('construction', 'Construction enterprises in the NBS nonmanufacturing PMI survey'),
  construction_pmi_orders: pmi('construction', 'Construction enterprises in the NBS nonmanufacturing PMI survey'),
  construction_pmi_employment: pmi('construction', 'Construction enterprises in the NBS nonmanufacturing PMI survey'),
  services_pmi_activity: pmi('real_economy', 'Service enterprises in the NBS nonmanufacturing PMI survey'),
  services_pmi_orders: pmi('real_economy', 'Service enterprises in the NBS nonmanufacturing PMI survey'),
  services_pmi_employment: pmi('real_economy', 'Service enterprises in the NBS nonmanufacturing PMI survey'),
} satisfies Record<string, Metric>;

export type ResearchSeries = keyof typeof researchCatalog;
export const researchIds = Object.keys(researchCatalog) as ResearchSeries[];
