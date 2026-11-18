<p align="center">
  <a href="https://cuwatch.vercel.app/"><img src="./src/app/icon.svg" width="128" alt="China Employment Watch logo" /></a>
</p>

# China Employment Watch

<p align="right"><strong>English</strong> · <a href="./README_zh.md">简体中文</a></p>

[![GitHub deployments](https://img.shields.io/github/deployments/ZhanZiyuan/china-unemployment-watch/Production)](https://github.com/ZhanZiyuan/china-unemployment-watch/deployments)
[![GitHub last commit](https://img.shields.io/github/last-commit/ZhanZiyuan/china-unemployment-watch)](https://github.com/ZhanZiyuan/china-unemployment-watch/commits/main/)
[![GitHub License](https://img.shields.io/github/license/ZhanZiyuan/china-unemployment-watch)](./LICENSE)
[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-000000?logo=vercel)](https://cuwatch.vercel.app/)

## About the project

[China Employment Watch](https://cuwatch.vercel.app/) is a research dashboard for China's labour market. It publishes traceable monthly unemployment and PMI employment observations from the National Bureau of Statistics of China.

The initial collection covers releases from 1 January 2023 through 17 November 2026, inclusive, in Asia/Shanghai. The initial archive contains 176 verified observations through October 2026. January 2023, 2024, 2025 and 2026 are missing from both unemployment series.

The multidimensional study adds 32 official series with 944 verified observations in its initial snapshot. It covers construction and services PMI, manufacturing production and orders, property development, migrant workers and annual construction statistics. Financial data await a licensed history and reuse rights.

## Features

- **Interactive historical charts** show national urban and 31-city unemployment, manufacturing and non-manufacturing PMI employment, and an experimental PMI employment demand index. Recharts provides independent date ranges, zoom, brush selection, and tooltips with source links.
- **Traceable publications** link observations to archived official releases. The version manifest opens on the dashboard and shows the dataset and algorithm versions, publication time, covered period, quality status and checksum. The dataset and manifest are available as JSON downloads.
- **Daily collection** checks for new releases and revisions at 11:17 Asia/Shanghai. Pushes to `main` and manual dispatch can also start a collection. Failed collections retain the previous verified snapshot.
- **Responsive interface** supports English, Japanese, Simplified Chinese and Traditional Chinese. The theme follows the device setting until manually changed.

## Data and methodology

The collection pipeline starts in [scripts/fetch-data.ts](scripts/fetch-data.ts). It validates the native observation period, archives the official release and metadata, and publishes a versioned JSON snapshot after the quality gate passes.

The experimental employment demand index averages two robustly standardized PMI employment series with equal weights and a fixed January 2023–December 2024 baseline. The search, exam and shadow indices display insufficient data while comparable search inputs remain unavailable.

[Data sources and coverage](docs/data-sources.md) · [Methodology and backtest](docs/methodology.md) · [Pipeline and deployment](docs/data-pipeline.md) · [Repository audit](docs/repository-audit.md)

The sector pressure score and publication-aware rolling comparison are published separately. The added features did not consistently improve over the PMI benchmark in the initial held-out sample.

[Multidimensional sources](docs/multidimensional-data.md) · [Model methodology and results](docs/multidimensional-methodology.md) · [Financial data access](docs/financial-data.md)

## Tech stack

- **Application** — Next.js 16 with Turbopack, React 19 and strict TypeScript.
- **Interface** — Tailwind CSS 4, shadcn/ui, Lucide icons, Recharts 3 and next-intl.
- **Data and deployment** — Zod, GitHub Actions and Vercel.

The App Router lives in `src/app/`, with UI in `src/components/`, locale files in `src/i18n/` and shared code in `src/lib/`. The dashboard reads verified files from `public/data/`. Original releases and collection metadata live in `data/`.

## Getting started

Use Node.js 22.12 or newer and pnpm 10.33.0. GitHub Actions uses Node.js 24.

```bash
git clone https://github.com/ZhanZiyuan/china-unemployment-watch.git
cd china-unemployment-watch
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:9002](http://localhost:9002/).

### Update data

- `pnpm fetch-data` collects recent releases and confirmed revisions.
- `pnpm fetch-data --backfill` attempts the initial historical collection.
- `pnpm fetch-data --from-archive` regenerates the publication offline from the archived evidence.
- `pnpm fetch-research` updates the additional official sources. Add `--backfill` for the initial window.
- `pnpm build-research-models` rebuilds the independent research model report offline. Rerun it after either snapshot changes.

### Run checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm validate-data
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## License

The project code is licensed under [GPLv3](./LICENSE). Source links and archive metadata identify the publishers of the underlying statistics.
