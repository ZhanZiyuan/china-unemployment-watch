import { expect, test } from '@playwright/test';

const locales = {
  en: 'China Employment Watch',
  ja: '中国雇用ウォッチ',
  'zh-CN': '中国就业市场观察',
  'zh-TW': '中國就業市場觀察',
};

for (const [locale, title] of Object.entries(locales)) {
  test(`serves localized dashboard and metadata for ${locale}`, async ({ page }) => {
    await page.goto('/' + locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page).toHaveTitle(title);
    await expect(page.getByTestId('official-chart').locator('.recharts-line').first()).toBeVisible();
  });
}

test('negotiates the browser language, keeps the current page and follows the system theme', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'ja-JP', colorScheme: 'dark' });
  try {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/ja$/);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: '表示テーマを切り替え' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.goto('/ja?source=test#pmi-chart');
    await page.getByRole('combobox', { name: '言語' }).selectOption('zh-TW');
    await expect(page).toHaveURL(/\/zh-TW\?source=test#pmi-chart$/);
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  } finally {
    await context.close();
  }

  const unmatched = await browser.newContext({ locale: 'fr-FR' });
  try {
    const page = await unmatched.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/zh-CN$/);
  } finally {
    await unmatched.close();
  }
});

test('zooms from full coverage to one exact day without changing other charts', async ({ page }) => {
  await page.goto('/en');
  const official = page.getByTestId('official-chart');
  const pmi = page.getByTestId('pmi-chart');
  const from = official.getByLabel('Start date');
  const to = official.getByLabel('End date');
  const last = await to.inputValue();
  await expect(from).toHaveValue('2023-01-01');
  await official.getByRole('button', { name: 'Zoom in' }).click();
  await expect(from).not.toHaveValue('2023-01-01');
  await expect(pmi.getByLabel('Start date')).toHaveValue('2023-01-01');
  await official.getByRole('button', { name: 'Zoom out' }).click();
  await official.getByRole('button', { name: 'Reset' }).click();
  await from.fill(last);
  await expect(from).toHaveValue(last);
  await expect(to).toHaveValue(last);
  await expect(official.getByRole('listitem')).toHaveCount(2);
  const toggle = official.getByRole('button', { name: 'National urban unemployment' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(official.getByRole('listitem')).toHaveCount(1);

  await official.getByRole('button', { name: 'Reset' }).click();
  await from.fill('2025-02-13');
  await to.fill('2025-02-13');
  await expect(official.getByRole('status')).toHaveText('No observations in this date range.');
  await expect(pmi.getByLabel('End date')).toHaveValue(last);
});

test('shows a source-linked tooltip and supports a brush drag', async ({ page }) => {
  await page.goto('/en');
  const chart = page.getByTestId('official-chart');
  const main = chart.locator('.recharts-line-dot').last();
  await main.hover();
  await expect(chart.getByRole('link', { name: 'Original release' }).first()).toBeVisible();
  const handle = chart.getByRole('slider', { name: 'Drag to change date range' }).first();
  const box = await handle.boundingBox();
  if (!box) throw new Error('Brush handle is not visible');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(chart.getByLabel('Start date')).not.toHaveValue('2023-01-01');
});

test.describe('touch viewport', () => {
  test.use({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
  test('fits the dashboard on mobile and shows a touched observation', async ({ page }) => {
    await page.goto('/en');
    const chart = page.getByTestId('official-chart');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await chart.locator('.recharts-line-dot').last().tap();
    await expect(chart.getByRole('link', { name: 'Original release' }).first()).toBeVisible();
    await chart.getByRole('button', { name: 'Zoom in' }).tap();
    await expect(chart.getByLabel('Start date')).not.toHaveValue('2023-01-01');
  });
});
