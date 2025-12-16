<p align="center">
    <img alt="logo" src="./src/app/icon.svg"
        width="138" />
</p>

# China Unemployment Watch

<p align="right">
    <b>English</b> | <a href="./README_zh.md">简体中文</a>
</p>

[![GitHub deployments](https://img.shields.io/github/deployments/ZhanZiyuan/china-unemployment-watch/Production)](https://github.com/ZhanZiyuan/china-unemployment-watch/deployments)
[![GitHub last commit](https://img.shields.io/github/last-commit/ZhanZiyuan/china-unemployment-watch)](https://github.com/ZhanZiyuan/china-unemployment-watch/commits/main/)
[![GitHub License](https://img.shields.io/github/license/ZhanZiyuan/china-unemployment-watch)](https://github.com/ZhanZiyuan/china-unemployment-watch/blob/main/LICENSE)
[![Vercel Deploy](https://deploy-badge.vercel.app/vercel/cuwatch)](https://cuwatch.vercel.app/)

An unofficial job anxiety monitoring index built using Google Trends search data (over the past 5 years).

## About The Project

This dashboard presents a "Composite Unemployment Index" derived from Google Trends data for various keywords related to job searching, recruitment, civil service exams, and unemployment phenomena. By aggregating and weighting these trends, the index offers a proxy for the collective anxiety and activity surrounding employment in China.

The data is automatically updated daily, providing a near real-time view of the employment landscape.

## Features

- **Composite Unemployment Index:** A weighted index that synthesizes multiple search categories into a single, comprehensive metric.
- **Historical Trend Chart:** An interactive chart from [Recharts](https://recharts.org/) displaying the index and its underlying components since 2021.
- **Categorized Metrics:** View individual trend data for four key categories: Job Searching, Recruitment, Public Exams, and Unemployment.
- **Daily Data Updates:** A GitHub Action runs every day to fetch the latest data from Google Trends, ensuring the dashboard stays current.
- **Transparent Methodology:** The entire data processing pipeline is open-source, from the keywords used to the weighting in the final index.
- **Modern Tech Stack:** Built with Next.js 15, React 19, and TypeScript for a fast, reliable, and maintainable application.
- **Responsive Design & Dark Mode:** A clean, mobile-friendly UI built with Shadcn/ui and Tailwind CSS.

## Data & Methodology

The core of this project is its data pipeline, which can be found in `scripts/fetch-trends.ts`.

- **Data Source:** The raw data is sourced from the **Google Trends API**, targeting the geo-location 'CN' (China).
- **Keyword Categories:** We track a curated list of keywords grouped into four categories:
  - **Job Seeking:** "找工作" (find job), "求职" (job search), etc.
  - **Recruitment:** "招聘" (hiring), "社招" (experienced hire), etc.
  - **Public Exams:** "考研" (postgrad exam), "国考" (national civil service exam), etc.
  - **Unemployment:** "失业" (unemployed), "裁员" (layoffs), etc.
- **Data Fetching:** To overcome Google Trends' scaling limitations, the script fetches data in overlapping 6-month windows.
- **Processing & Indexing:**
  - The raw daily data is aggregated into weekly medians for each category.
  - The data for each category is normalized using a Z-score calculation.
  - A final **Composite Index** is calculated using the following weights:
    - `Job Seeking`: 35%
    - `Unemployment`: 25%
    - `Recruitment`: 20%
    - `Public Exams`: 20%
  - This processed data is then saved as `src/lib/trends-data.json`.
- **Automation:** A GitHub Actions workflow (see `.github/workflows/update-trends.yml`) runs daily at 00:00 UTC to execute the fetching script and commit the updated data back to the repository.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) 15 (with Turbopack)
- **UI Library:** [React](https://react.dev/) 19
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Data Visualization:** [Recharts](https://recharts.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Shadcn/ui](https://ui.shadcn.com/)
- **Data Fetching:** [google-trends-api](https://www.npmjs.com/package/google-trends-api)
- **CI/CD:** [GitHub Actions](https://github.com/features/actions)
- **Hosting:** [Vercel](https://vercel.com/)

## Getting Started

To run a local copy of this project:

### Prerequisites

- Node.js v20 or newer
- `npm` or `yarn`

### Installation

- Clone the repository:

```bash
git clone https://github.com/ZhanZiyuan/china-unemployment-watch.git
cd china-unemployment-watch
```

- Install NPM packages:

```bash
npm install
```

### Running Locally

Start the development server (with Turbopack):

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) in your browser.

### Manually Updating Data

You can manually trigger the data fetching script:

```bash
npm run fetch-trends
```

## License

This project is licensed under the GPLv3 License - see the [LICENSE](./LICENSE) file for details.
