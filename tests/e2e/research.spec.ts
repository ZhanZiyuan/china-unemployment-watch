import { expect, test } from '@playwright/test';

const tabs = {
  en: 'Model comparison',
  ja: 'モデル比較',
  'zh-CN': '模型对照',
  'zh-TW': '模型對照',
};

for (const [locale, label] of Object.entries(tabs)) {
  test(`shows matching localized research and rolling model terms for ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}#research`);
    await page.getByRole('tab', { name: label }).click();
    await expect(page.getByTestId('sector-pressure').locator('.recharts-line')).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(2);
    await expect(page.getByRole('rowheader').filter({ hasText: 'M4' })).toHaveCount(2);
  });
}

test('plots the official joint period with no observations on unrelated days', async ({ page }) => {
  await page.goto('/en#research');
  await page.getByRole('tab', { name: 'Real estate' }).click();
  const chart = page.getByTestId('property-growth');
  await chart.getByLabel('Start date').fill('2026-02-28');
  await chart.getByLabel('End date').fill('2026-02-28');
  const point = chart.getByRole('listitem').filter({ hasText: 'Development investment' });
  await expect(point).toContainText('-11.1');
  await expect(point).toContainText('Jan 1, 2026');
  await expect(point.getByRole('link')).toHaveAttribute('href', /^https:\/\/www\.stats\.gov\.cn\//);
  await chart.getByRole('button', { name: 'Reset' }).click();
  await chart.getByLabel('Start date').fill('2024-12-30');
  await chart.getByLabel('End date').fill('2024-12-30');
  await expect(chart.getByRole('status')).toHaveText('No observations in this date range.');
});

test.describe('research at phone width', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });
  test('shows a touch tooltip for annual observations and a genuine finance empty state', async ({ page }) => {
    await page.goto('/en#research');
    await page.getByRole('tab', { name: 'Migrant workers' }).tap();
    const chart = page.getByTestId('migrant-income');
    await expect(chart.locator('.recharts-line-dot').nth(2)).toBeVisible();
    await chart.locator('.recharts-line-dot').last().tap();
    await expect(chart.getByRole('link', { name: 'Original release' })).toBeVisible();
    await page.getByRole('tab', { name: 'Financial markets' }).tap();
    await expect(page.getByRole('tabpanel').getByRole('status')).toContainText('pending licensed historical data');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
});
