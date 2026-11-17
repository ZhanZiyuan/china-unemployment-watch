# Initial release status

## Verified evidence

- Remote main and develop were audited before source changes. The two rejected legacy exports remain available in Git history.
- The initial archive reproduces 176 official monthly observations. The manifest checksums the exact published bytes. The dataset reports four January gaps in each unemployment series and preserves both monthly PMI series through October 2026.
- The November 17 local incremental run fetched both official sources successfully. The dataset and manifest checksums matched their values before refresh.
- The development suite has 12 unit and integration tests covering source parsing, errors, timeouts, absence versus zero, grain, dates, duplicate keys, stale data, revision retention, calibration, backtest time order, workflow configuration, and end-to-end retention of the published files after a source challenge.
- The production build was tested with eight Chromium browser tests in desktop and touch contexts. The checks exercise four locales, redirect fallback, system theme, date range, independent charts, brush drag, legend toggle and source-linked tooltips.

## Open production checks

- The daily schedule, manual dispatch on main, PR merge trigger, concurrent-event serialization and bot push loop protection are configured. Their live behavior must be observed after the owner merges the workflow to the default branch. GitHub's main branch rule lookup showed deletion and non-fast-forward protection.
- The existing Vercel production URL is linked to main. The production manifest returned HTTP 404 before the refactor was released. The production updater checks the deployed manifest, data and health files by exact checksum.
- Site reliability depends on continued access to the public NBS releases from hosted runners. Direct NBS responses sometimes contained an HTTP 200 access page. The collector verifies content and can retain the last good snapshot with a visible failure status.
- National Data age-group statistics, Google Trends API Alpha, Baidu Index and recruitment listings have no verified connection in this release. Google Trends requires approved API access, and Baidu requires authorized access and republication. A lawful recurring recruitment feed remains unverified.
- The PMI demand index is experimental. The shadow index has no eligible search inputs or backtest observations. The four January unemployment gaps remain documented as missing within the verified ingestion scope.
