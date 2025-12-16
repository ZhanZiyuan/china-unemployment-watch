<p align="center">
    <img alt="logo" src="./src/app/icon.svg"
        width="138" />
</p>

# 中国失业观察

<p align="right">
    <a href="./README.md">English</a> | <b>简体中文</b>
</p>

[![GitHub deployments](https://img.shields.io/github/deployments/ZhanZiyuan/china-unemployment-watch/Production)](https://github.com/ZhanZiyuan/china-unemployment-watch/deployments)
[![GitHub last commit](https://img.shields.io/github/last-commit/ZhanZiyuan/china-unemployment-watch)](https://github.com/ZhanZiyuan/china-unemployment-watch/commits/main/)
[![GitHub License](https://img.shields.io/github/license/ZhanZiyuan/china-unemployment-watch)](https://github.com/ZhanZiyuan/china-unemployment-watch/blob/main/LICENSE)
[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/cuwatch)](https://cuwatch.vercel.app/)

基于 Google Trends 搜索数据构建的非官方就业焦虑监测指标 (过去5年)。

## 关于项目

该仪表板展示了一个“综合失业指数”，该指数来源于与求职、招聘、公务员考试和失业现象相关的各种关键词的谷歌趋势数据。通过汇总和加权这些趋势，该指数为了解中国就业市场的集体焦虑和活动提供了一个代理指标。

数据每日自动更新，近乎实时地反映就业市场的动态。

## 功能特性

- **综合失业指数：** 一个将多个搜索类别综合成单一、全面指标的加权指数。
- **历史趋势图：** 使用 [Recharts](https://recharts.org/) 制作的交互式图表，展示自2021年以来该指数及其基本组成部分。
- **分类指标：** 可查看四个关键类别的独立趋势数据：求职、招聘、考试和失业。
- **每日数据更新：** 通过 GitHub Action 每日运行，从谷歌趋势获取最新数据，确保仪表板的时效性。
- **透明的方法论：** 从使用的关键词到最终指数的权重，整个数据处理流程完全开源。
- **现代技术栈：** 使用 Next.js 15、React 19 和 TypeScript 构建，应用快速、可靠且易于维护。
- **响应式设计与深色模式：** 使用 Shadcn/ui 和 Tailwind CSS 构建的简洁、移动端友好的用户界面。

## 数据与方法论

本项目的核心是其数据管道，具体实现位于 `scripts/fetch-trends.ts`。

- **数据来源：** 原始数据来源于 **Google Trends API**，地理位置定位为 'CN' (中国)。
- **关键词分类：** 我们跟踪一组精心挑选的关键词，并将其分为四类：
  - **求职：** "找工作"、"求职" 等。
  - **招聘：** "招聘"、"社招" 等。
  - **考试：** "考研"、"国考" 等。
  - **失业：** "失业"、"裁员" 等。
- **数据获取：** 为规避谷歌趋势的伸缩限制，脚本以重叠的6个月窗口期获取数据。
- **处理与指数计算：**
  - 原始每日数据被聚合成每个类别的每周中位数。
  - 使用 Z-score 对每个类别的数据进行归一化处理。
  - 最终的 **综合指数** 使用以下权重计算得出：
    - `求职`: 35%
    - `失业`: 25%
    - `招聘`: 20%
    - `考试`: 20%
  - 处理后的数据被保存为 `src/lib/trends-data.json`。
- **自动化：** 一个 GitHub Actions 工作流 (见 `.github/workflows/update-trends.yml`) 在每天 UTC 时间 00:00 运行，执行数据获取脚本并将更新后的数据提交回代码仓库。

## 技术栈

- **框架:** [Next.js](https://nextjs.org/) 15 (使用 Turbopack)
- **UI 库:** [React](https://react.dev/) 19
- **语言:** [TypeScript](https://www.typescriptlang.org/)
- **数据可视化:** [Recharts](https://recharts.org/)
- **样式:** [Tailwind CSS](https://tailwindcss.com/)
- **UI 组件:** [Shadcn/ui](https://ui.shadcn.com/)
- **数据获取:** [google-trends-api](https://www.npmjs.com/package/google-trends-api)
- **CI/CD:** [GitHub Actions](https://github.com/features/actions)
- **托管:** [Vercel](https://vercel.com/)

## 本地运行

要在本地运行此项目副本：

### 先决条件

- Node.js v20 或更高版本
- `npm` 或 `yarn`

### 安装

- 克隆代码仓库:

```bash
git clone https://github.com/ZhanZiyuan/china-unemployment-watch.git
cd china-unemployment-watch
```

- 安装 NPM 依赖包:

```bash
npm install
```

### 运行

启动开发服务器 (使用 Turbopack):

```bash
npm run dev
```

在浏览器中打开 [http://localhost:9002](http://localhost:9002)。

### 手动更新数据

您可以手动触发数据获取脚本：

```bash
npm run fetch-trends
```

## 许可证

本项目基于 GPLv3 许可证 - 详情请参阅 [LICENSE](./LICENSE) 文件。
