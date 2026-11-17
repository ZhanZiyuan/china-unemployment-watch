# 中国就业市场观察

[English](README.md) · [生产站点](https://cuwatch.vercel.app/)

面向中国就业市场的开放数据研究仪表板，发布可追溯的国家统计局月度调查失业率与 PMI 从业人员数据。网站支持简体中文、繁體中文、日本語和 English。

初始采集范围为北京时间 2023-01-01 至 2026-11-17，首尾日期均包含。初始档案有 176 条通过验证的观测，截至 2026 年 10 月。失业率的四个 1 月缺口在页面中保留。PMI 就业需求指数为实验性指标。搜索、考试和影子指数暂缺可比的搜索数据。

## 本地开发

使用 Node.js 22.12 或更新版本和 pnpm 10.33.0。GitHub Actions 使用 Node.js 24。项目保留 `src/` 布局，使用 Next.js 16 与 Turbopack、React 19、TypeScript strict、Tailwind CSS 4、shadcn/ui、Recharts 3、next-intl 和 Zod。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

访问 [localhost:9002](http://localhost:9002/)。网站读取 `public/data/` 中通过验证的快照。

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm validate-data
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## 数据更新与复核

- `pnpm fetch-data` 增量采集近期发布，并记录可证实的历史修订。
- `pnpm fetch-data --backfill` 尝试补采初始历史范围。
- `pnpm fetch-data --from-archive` 验证原始档案，并在离线环境重建生产 JSON。
- GitHub Actions 每天北京时间 11:17、每次 `main` 更新和手动触发时运行。采集串行执行，失败保留上一个有效快照，发布后检查 Vercel 的数据版本和校验和。

[数据来源与覆盖范围](docs/data-sources.md) · [采集架构与部署](docs/data-pipeline.md) · [统计方法和回测](docs/methodology.md) · [旧版审计](docs/repository-audit.md)

项目代码遵循 [GPLv3](LICENSE)。观测的来源链接及档案元信息标明原始发布主体。
