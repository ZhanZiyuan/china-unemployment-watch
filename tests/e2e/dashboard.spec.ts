import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { manifestSchema } from '../../src/lib/market/schema';

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
    const language = page.getByRole('button', { name: '言語' });
    await expect(language.locator('svg.lucide-languages')).toBeVisible();
    await language.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitemradio')).toHaveText(['English', '日本語', '简体中文', '繁體中文']);
    await expect(page.getByRole('menuitemradio', { name: '日本語' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('menuitemradio', { name: '繁體中文' }).click();
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

test('orders the theme, language and GitHub icons from left to right on desktop', async ({ page }) => {
  await page.goto('/en');
  const header = page.getByRole('banner');
  const theme = await header.getByRole('button', { name: 'Toggle color theme' }).boundingBox();
  const language = await header.getByRole('button', { name: 'Language' }).boundingBox();
  const githubLink = header.getByRole('link', { name: 'GitHub repository' });
  const github = await githubLink.boundingBox();
  if (!theme || !language || !github) throw new Error('Header controls are not visible');
  expect(theme.x + theme.width).toBeLessThanOrEqual(language.x);
  expect(language.x + language.width).toBeLessThanOrEqual(github.x);
  await expect(githubLink).toHaveAttribute('href', 'https://github.com/ZhanZiyuan/china-unemployment-watch');
});

test('reads the localized version manifest and downloads the matching publication', async ({ page, request }) => {
  const response = await request.get('/data/manifest.json');
  expect(response.ok()).toBe(true);
  const manifest = manifestSchema.parse(await response.json());
  await page.goto('/zh-CN');
  const trigger = page.getByRole('button', { name: '版本清单' });
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: '版本清单' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(manifest.dataset_version, { exact: true })).toBeVisible();
  await expect(dialog.getByText(manifest.algorithm_version, { exact: true })).toBeVisible();
  await expect(dialog.getByText(manifest.sha256, { exact: true })).toBeVisible();

  const [manifestDownload] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('link', { name: '下载清单 JSON' }).click(),
  ]);
  expect(manifestDownload.suggestedFilename()).toBe('manifest.json');
  expect(await readFile(await manifestDownload.path())).toEqual(await response.body());
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/\/zh-CN$/);

  const [datasetDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: '下载 JSON', exact: true }).click(),
  ]);
  expect(datasetDownload.suggestedFilename()).toBe('latest.json');
  const bytes = await readFile(await datasetDownload.path());
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.sha256);
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

  test('fits the language menu and switches locale at narrow phone width', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 664 });
    await page.goto('/en');
    const trigger = page.getByRole('button', { name: 'Language' });
    const button = await trigger.boundingBox();
    expect(button?.width).toBeGreaterThanOrEqual(44);
    await trigger.tap();
    const menu = await page.getByRole('menu').boundingBox();
    if (!menu) throw new Error('Language menu is not visible');
    expect(menu.x).toBeGreaterThanOrEqual(0);
    expect(menu.x + menu.width).toBeLessThanOrEqual(320);
    await page.getByRole('menuitemradio', { name: '简体中文' }).tap();
    await expect(page).toHaveURL(/\/zh-CN$/);
  });

  test('fits the version manifest on a narrow phone and closes on touch', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/zh-CN');
    const trigger = page.getByRole('button', { name: '版本清单' });
    await trigger.tap();
    const dialog = page.getByRole('dialog', { name: '版本清单' });
    const box = await dialog.boundingBox();
    if (!box) throw new Error('Version manifest is not visible');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(box.y + box.height).toBeLessThanOrEqual(568);
    await expect(dialog.getByRole('link', { name: '下载清单 JSON' })).toBeVisible();
    await dialog.getByRole('button', { name: '关闭' }).tap();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

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
