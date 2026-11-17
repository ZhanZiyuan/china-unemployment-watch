# China Employment Watch

[简体中文](README_zh.md) · [Production site](https://cuwatch.vercel.app/)

An open research dashboard for China's labour market. It publishes traceable, monthly unemployment and PMI employment observations from the National Bureau of Statistics. The dashboard supports English, Japanese, Simplified Chinese and Traditional Chinese.

The initial collection window is 2023-01-01 through 2026-11-17, inclusive, in Asia/Shanghai. The initial archive contains 176 verified observations through October 2026. The four January unemployment gaps remain visible. The PMI employment demand index is experimental. The search, exam and shadow indices display insufficient data pending comparable search evidence.

## Development

Use Node.js 22.12 or newer and pnpm 10.33.0. The Actions runners use Node.js 24. Source code uses the `src/` layout with Next.js 16 and Turbopack, React 19, strict TypeScript, Tailwind CSS 4, shadcn/ui, Recharts 3, next-intl and Zod.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:9002](http://localhost:9002/). The app reads the validated snapshot in `public/data/`.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm validate-data
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## Collection and research

- `pnpm fetch-data` refreshes recent releases and applies confirmed revisions.
- `pnpm fetch-data --backfill` attempts the initial historical window.
- `pnpm fetch-data --from-archive` validates the archived evidence and regenerates the publication offline.
- GitHub Actions updates at 11:17 Asia/Shanghai, on every push to `main`, and by manual dispatch. The workflow serializes writes, retains the last good snapshot on source failure and verifies the deployed version after a Vercel rebuild.

[Data sources and coverage](docs/data-sources.md) · [Pipeline and deployment](docs/data-pipeline.md) · [Methodology and backtest](docs/methodology.md) · [Legacy audit](docs/repository-audit.md)

Project code is licensed under [GPLv3](LICENSE). Source links and archived release metadata identify the original data publishers.
