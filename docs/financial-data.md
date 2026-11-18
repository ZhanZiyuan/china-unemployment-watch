# A-share financial data research

The source audit dated 2026-11-18 verified seven benchmark identifiers. Financial observations remain `unconnected`. The candidate M5-A has no estimates or held-out results because the project has no verified daily close feed with the required access and reuse terms.

## Benchmark identities and coverage

| Official index | Code | Compiler and distributor | First publication | Official evidence |
|---|---|---|---|---|
| 沪深300指数 | `000300` | China Securities Index (CSI) | 2005-04-08 | [CSI factsheet](https://oss-ch.csindex.com.cn/static/html/csindex/public/uploads/indices/detail/files/zh_CN/000300factsheet.pdf) |
| 中证小盘500指数 | `000905` | CSI | 2007-01-15 | [CSI factsheet](https://oss-ch.csindex.com.cn/static/html/csindex/public/uploads/indices/detail/files/zh_CN/000905factsheet.pdf) |
| 中证全指指数 | `000985` | CSI | 2011-08-02 | [CSI factsheet](https://oss-ch.csindex.com.cn/static/html/csindex/public/uploads/indices/detail/files/zh_CN/000985factsheet.pdf) |
| 上证综合指数 | `000001` | Shanghai Stock Exchange (SSE), with CSI methodology maintenance | 1991-07-15 | [SSE index overview](https://www.sse.com.cn/market/sseindex/overview/), [SSE factbook](https://www.sse.com.cn/aboutus/publication/factbook/documents/c/10170571/files/f43f33c247f242d48780c3097548281b.pdf) |
| 中证全指房地产指数 | `931775` | CSI | 2013-07-15 | [CSI factsheet](https://oss-ch.csindex.com.cn/static/html/csindex/public/uploads/indices/detail/files/zh_CN/931775factsheet.pdf) |
| 中证全指建筑材料指数 | `931009` | CSI | 2013-07-15 | [CSI factsheet](https://oss-ch.csindex.com.cn/static/html/csindex/public/uploads/indices/detail/files/zh_CN/931009factsheet.pdf) |
| 中证全指建筑装饰指数 | `931931` | CSI | 2022-07-21 | [CSI factsheet](https://oss-ch.csindex.com.cn/static/html/csindex/public/uploads/indices/detail/files/zh_CN/931931factsheet.pdf) |

The planned input is the CNY price-index close in index points. Preserve the provider namespace, including leading zeros. The SSE Composite covers the broader SSE market. The CSI All Share includes eligible Beijing-listed securities. The SSE Composite methodology changed effective 2026-10-26 and the version should be recorded in any future study. All seven indices were published before the target window. Complete daily coverage by code from 2023-01-01 through 2026-11-17 remains unverified. The index inception dates, factsheet charts and product-level start dates establish distinct facts. [SSE methodology notice](https://www.sse.com.cn/market/sseindex/diclosure/c/c_20260924_10833342.shtml) · [CSI All Share methodology](https://oss-ch.csindex.com.cn/static/html/csindex/public/uploads/indices/detail/files/zh_CN/20231208175438-000985_Index_Methodology_cn.pdf)

## Access and publication rights

| Channel | Evidence and decision |
|---|---|
| CSI official website and data services | Factsheets and public market reports establish index identity and published examples. The publisher's services route provides access to data products. A documented daily historical endpoint with project-wide archive and publication rights remains unverified. [CSI](https://www.csindex.com.cn/) · [SSE index services](https://www.sse.com.cn/transparency/services/index.shtml) |
| SSE public website and exchange services | SSE publishes its index overview, market data directory and data licensing route. The website terms permit qualifying noncommercial browsing and downloading, while the exchange trading rules and distribution terms also apply. The project has no confirmed grant covering a public archive of this feed. [Public data catalog](https://www.sse.com.cn/market/publicdata/) · [Website terms](https://www.sse.com.cn/home/legal/) · [2026 trading rules](https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/exchange/c/c_20260424_10816482.shtml) |
| SZSE and Shenzhen Securities Information | SZSE routes market data licensing through its subsidiary. Section 5.1.3 of the 2026 rules addresses use and onward distribution of exchange data. This route supplies no verified alternative publication grant for the seven listed indices. [SZSE organization](https://www.szse.cn/aboutus/sse/organizational/) · [2026 trading rules](https://docs.static.szse.cn/www/lawrules/rule/trade/W020260424690713155663.pdf) |
| CIIS official historical delivery | The SSE and China Indices historical EOD product documents 1990-12-19 as its product-level first date. Yearly GB2312 pipe-delimited text includes trading date, code, OHLC, volume and turnover. Product delivery is by subscription or order and the ongoing EOD archive has monthly delivery. Availability by code, a daily update channel, actual release or delivery timestamps, and permission for a public archive all require confirmation. [Product and delivery](https://www.ciis.com.hk/hongkong/sc/historicaldata1/his_introduction/index.shtml) · [Product manual, sections 3, 5 and 7.1](https://www.ciis.com.hk/hongkong/sc/uploadfiles/202608/24/2026082405192876871254.pdf) |

The CIIS distribution guide distinguishes eligible once-daily EOD forwarding after Hong Kong midnight from the subscribed historical offering. It describes a route for approved historical distribution to customers for internal use. The EOD exception alone leaves the proposed public reproduction of a backfilled archive and associated derived outputs unverified. The project has not ordered data or acquired a license. The outstanding evidence is confirmation for the named indexes covering archive retention, public GitHub and Vercel redistribution, derived model outputs, the delivery cadence and available dates. [CIIS distribution guide, sections C.4–C.5](https://www.ciis.com.hk/hongkong/sc/uploadfiles/202601/09/2026010917282255474308.pdf)

## Data and model specification for licensed input

Each daily row will record `index_code`, `trading_date`, `close`, `currency`, `price_type`, `provider`, `source_url`, `published_at`, `fetched_at`, `raw_sha256` and `revision_id`. Preserve each revision's original bytes and publication history under the rights permitted by the provider. Match actual sessions to official exchange calendars and use the provider's documented publication or delivery time. An archive received later is available at its verified delivery time if an original publication time cannot be established. At 11:17 Shanghai time the current session cannot contribute a final close. A push-triggered job may use only a finalized, delivered close. Leave any missing or provisional session unfilled. The CIIS manual documents carried closing values and zero fields for suspended instruments, so eligibility and suspension flags must be reconciled before computing features. [SSE holidays](https://www.sse.com.cn/disclosure/dealinstruc/closed/) · [CIIS product manual](https://www.ciis.com.hk/hongkong/sc/uploadfiles/202608/24/2026082405192876871254.pdf)

For a complete month, let `P[t]` be the final price-index close on trading session `t`, and `E_m` the last trading session of month `m`.

| Feature | Proposed calculation |
|---|---|
| Monthly log return | `log(P[E_m] / P[E_(m-1)])` |
| Monthly realized volatility | Square root of the sum of squared daily log returns in the month, using the previous month's final close for the first daily return |
| Industry relative return | Industry log return minus CSI All Share log return, using matched sessions and the same price-index convention |
| Within-month maximum drawdown | Minimum of `P[t] / runningMax(t) - 1`, initializing the running peak with the previous month's final close |
| Turnover | Sum verified session trade amounts in CNY only after the provider confirms the field definition and units for that index |

Any required endpoint close or trading session that lacks evidence invalidates the affected monthly feature. The January 2023 features also require the last 2022 close. The 2026-11-17 historical cutoff leaves November incomplete.

The initial proposed M5-A predictor is the past month's property-sector log return relative to CSI All Share. Keep other features descriptive until a model specification is registered. The candidate extends M4 with one input and a low-complexity ridge fit. Compare M0–M4 and M5-A on identical forecast origins and eligible months in a separate financial evaluation. Fit scaling and any tuning inside each training window. Retain the real publication and revision cutoff for every input. Evaluate sample size, MAE, RMSE, direction accuracy, error relative to M0 and M1, and coefficient and error stability across held-out halves. Any future output should include the training window, parameters, data version and model version. Current public data contain no financial figures or financial model metrics.
