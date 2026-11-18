# Financial-market data access

Financial market observations and M5 are currently unconnected. The provider documentation establishes benchmark ownership and data distribution channels. A reusable historical close feed and permission to publish archived inputs and derived research outputs are pending.

| Candidate | Provider evidence | Intended series |
|---|---|---|
| CSI 300, CSI 500, CSI All Share and sector benchmarks for real estate, building materials and construction & decoration | [China Securities Index](https://www.csindex.com.cn/) | CNY price-index closes, after confirming the exact sector benchmark codes and licence. |
| Hang Seng Index and Hang Seng China Enterprises Index | [Hang Seng Indexes data offering](https://www.hsi.com.hk/solutions/data-analytics/our-data-analytics-offerings/) | HKD price-index closes. Historical entitlement and public reuse depend on the product. |
| S&P 500 | [S&P DJI terms](https://www.spglobal.com/spdji/en/documents/legal/dow-jones-indexes-terms-conditions.pdf) | USD price-index closes. Website access is separate from index-data licensing. |
| Nasdaq Composite | [Nasdaq index data policy](https://nasdaqtrader.com/content/technicalsupport/dataproducts/indexdatapolicy.pdf) | USD price-index closes. Delayed public display does not establish archive or redistribution rights. |

An adapter must capture the vendor, benchmark code, index kind, quote currency, trading calendar, exchange time zone, session close, official publication time, acquisition UTC timestamp, entitlement and archive hash. Daily rows represent trading sessions only. For a complete traded month, log return uses the last official close divided by the previous month's last close, and realized volatility is the square root of the sum of squared daily log returns. The daily return interval includes the previous month's last close. Relative return subtracts a predeclared benchmark's same-month log return, aligned to comparable sessions and currency treatment. Drawdown is the minimum observed close-to-running-peak ratio minus one within the stated window. Incomplete months and missing closes stay missing.

The model comparison will evaluate any licensed financial feature on shared out-of-sample months with publication lag and only then consider promoting it.
