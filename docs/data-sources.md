# Data sources and initial coverage

The initial request is 2023-01-01 through 2026-11-17 inclusive, in Asia/Shanghai. The numbers below count complete calendar-month periods through October 2026. November was still in progress at the cutoff.

| Series | Frequency and unit | First period | Last period | Verified observations | Gaps |
|---|---|---|---|---:|---|
| NBS national urban surveyed unemployment | Monthly, percent | 2023-02 | 2026-10 | 42/46 | January 2023, 2024, 2025 and 2026 |
| NBS 31 major cities surveyed unemployment | Monthly, percent | 2023-02 | 2026-10 | 42/46 | January 2023, 2024, 2025 and 2026 |
| NBS manufacturing PMI employment subindex | Monthly, diffusion index points | 2023-01 | 2026-10 | 46/46 | None through October 2026 |
| NBS non-manufacturing PMI employment subindex | Monthly, diffusion index points | 2023-01 | 2026-10 | 46/46 | None through October 2026 |

The [NBS release archive](https://www.stats.gov.cn/sj/zxfb/) lists the primary releases. The [October 2026 activity release](https://www.stats.gov.cn/sj/zxfb/202611/t20261116_1965844.html) gives 5.1% for both rates. The [October 2026 PMI report](https://www.stats.gov.cn/sj/zxfb/202610/t20261031_1965718.html) gives 48.4 and 46.0. National and large-city unemployment have distinct populations. PMI reports the balance of employers reporting increases versus decreases, with 50 as the no-change threshold.

The March releases generally report January–February averages and explicit February rates. Those averages and reported month-to-month differences are excluded from the January extraction. January gaps reflect the verified ingestion scope. The first PMI vintage tracked for a month is the earliest successfully parsed release in this archive. Republished historical rows carry the publication date of the release actually used. When a route displays a date without a time, `published_at` is null and `publication_date` retains the stated date.

| Investigated source | Status | Historical coverage in this repository |
|---|---|---|
| National Data catalog and age-group unemployment | Unconnected. The public catalog probe returned HTTP 403. A separate age/cohort extraction and treatment of the 2023–24 definition break remain open. | None |
| Google Trends API Alpha | Unconnected. Requires approved access. | None |
| Google Trends unofficial library | Retired pending verification of scale, sampling and coverage. The original repository files lack raw evidence. | None |
| Baidu Index | Unconnected. Its help page says there is no open API. Access and republication require authorization. | None |
| Recruitment listings | Unconnected. No lawful recurring feed with compatible scope, archive and deduplication keys was verified. | None |

Source notices: [Google Trends API Alpha](https://developers.google.com/search/apis/trends), [Baidu Index help](https://index.baidu.com/Helper/?tpl=help).

## Evidence and checks

Each observation links to the source URL and to the SHA-256 of its original HTML body. `data/raw/*.html.gz` contains the unmodified decoded HTTP bodies. The corresponding metadata records the actual response timestamp in UTC, request URL, HTTP status and content type. `data/metadata/releases.json` binds each archived digest to its published release title. The initial live backfill yielded 169 observations. Replaying the archive with the updated city extraction rule and adding the separately captured, official July 2026 half-year release yielded 176 observations. The initial-run record preserves the original count.

`node --import tsx scripts/replay-history.ts --rebuild-initial` reconstructs the initial observations from the archived bodies on the M1 commit. The parser requires explicit monthly text or a labeled PMI table. It rejects conflicting same-day observations, HTML challenge pages, invalid range and period combinations, and missing monthly indicators. A second live run received an access challenge on the archive itself, even though the endpoint returned HTTP 200. The archive replay verified the existing evidence without treating the blocked request as a successful refresh.

The separate research snapshot covers construction and services PMI, manufacturing production and new orders, property development and sales, migrant workers and annual construction. Its source-specific units, release coverage, unresolved intervals and evidence are documented in [multidimensional data](multidimensional-data.md). The [financial market register](financial-data.md) records the source and licensing gaps.
