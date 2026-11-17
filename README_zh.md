<p align="center">
  <a href="https://cuwatch.vercel.app/"><img src="./src/app/icon.svg" width="128" alt="中国就业市场观察标志" /></a>
</p>

# 中国就业市场观察

<p align="right"><a href="./README.md">English</a> · <strong>简体中文</strong></p>

[![GitHub deployments](https://img.shields.io/github/deployments/ZhanZiyuan/china-unemployment-watch/Production)](https://github.com/ZhanZiyuan/china-unemployment-watch/deployments)
[![GitHub last commit](https://img.shields.io/github/last-commit/ZhanZiyuan/china-unemployment-watch)](https://github.com/ZhanZiyuan/china-unemployment-watch/commits/main/)
[![GitHub License](https://img.shields.io/github/license/ZhanZiyuan/china-unemployment-watch)](./LICENSE)
[![Vercel](https://img.shields.io/badge/Hosted%20on-Vercel-000000?logo=vercel)](https://cuwatch.vercel.app/)

## 关于项目

[中国就业市场观察](https://cuwatch.vercel.app/) 是面向中国就业市场的开放数据研究仪表板，发布可追溯的国家统计局月度调查失业率和 PMI 从业人员数据。

初始采集范围为北京时间 2023 年 1 月 1 日至 2026 年 11 月 17 日，首尾日期均包含。初始档案有 176 条通过验证的观测，截至 2026 年 10 月。两条失业率序列均缺少 2023、2024、2025 和 2026 年的 1 月数据。

## 功能特性

- **交互式历史图表**展示全国城镇和 31 个大城市调查失业率、制造业和非制造业 PMI 从业人员数据，以及实验性 PMI 就业需求指数。Recharts 提供独立日期范围、缩放、Brush 和带来源链接的提示。
- **可追溯的数据发布**将观测关联到官方发布稿。可在仪表板内打开版本清单，查看数据版本、算法版本、发布时间、覆盖区间、质量状态和校验和，也可下载数据及清单 JSON。
- **每日采集**于北京时间 11:17 检查新发布和修订。推送到 `main` 或手动触发也可启动采集。采集失败时保留上一个通过验证的快照。
- **响应式界面**支持简体中文、繁體中文、日本語和 English。主题默认跟随设备设置，也可手动切换。

## 数据与方法论

采集管道的入口位于 [scripts/fetch-data.ts](scripts/fetch-data.ts)。流程校验实际统计周期，归档原始发布稿及元数据，并在通过质量检查后发布带版本的 JSON 快照。

实验性就业需求指数使用 2023 年 1 月至 2024 年 12 月作为固定基准，对两条 PMI 从业人员序列做稳健标准化后等权平均。搜索、考试和影子指数暂无可比的搜索输入，页面显示数据不足。

[数据来源与覆盖范围](docs/data-sources.md) · [统计方法和回测](docs/methodology.md) · [采集架构与部署](docs/data-pipeline.md) · [仓库审计](docs/repository-audit.md)

## 技术栈

- **应用** — Next.js 16 与 Turbopack、React 19、TypeScript strict。
- **界面** — Tailwind CSS 4、shadcn/ui、Lucide 图标、Recharts 3、next-intl。
- **数据与部署** — Zod、GitHub Actions、Vercel。

App Router 位于 `src/app/`，界面组件位于 `src/components/`，翻译文件位于 `src/i18n/`，共享代码位于 `src/lib/`。仪表板读取 `public/data/` 中通过验证的快照。原始发布稿和采集元数据保存在 `data/`。

## 本地运行

使用 Node.js 22.12 或更新版本和 pnpm 10.33.0。GitHub Actions 使用 Node.js 24。

```bash
git clone https://github.com/ZhanZiyuan/china-unemployment-watch.git
cd china-unemployment-watch
pnpm install --frozen-lockfile
pnpm dev
```

在浏览器中打开 [localhost:9002](http://localhost:9002/)。

### 手动更新数据

- `pnpm fetch-data` 增量采集近期发布并记录已确认的修订。
- `pnpm fetch-data --backfill` 尝试补采初始历史范围。
- `pnpm fetch-data --from-archive` 使用归档证据离线重建发布快照。

### 运行检查

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm validate-data
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

## 许可证

项目代码遵循 [GPLv3](./LICENSE)。来源链接和归档元数据标明原始统计数据的发布主体。
