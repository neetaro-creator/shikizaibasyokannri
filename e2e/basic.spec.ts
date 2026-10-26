import { expect, test } from '@playwright/test';

const noHorizontalScroll = async (page: import('@playwright/test').Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );

test('検索 → 詳細で合計と車両別内訳が見える', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('カラビナ');
  await page.getByRole('link', { name: /^カラビナ/ }).first().click();
  await expect(page.getByRole('heading', { name: 'カラビナ' })).toBeVisible();
  await expect(page.getByTestId('total')).toHaveText(/\d+/);
  await expect(page.locator('.bars .vtag', { hasText: 'タンク1' })).toBeVisible();
  await expect(page.getByText('車両左側後部シャッター 下段')).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: 'e2e/screens/item.png', fullPage: true });
});

test('探す:分類を選ぶと品が並ぶ', async ({ page }) => {
  await page.goto('./#/browse');
  await page.getByRole('button', { name: 'ロープ・器具' }).click();
  await expect(page.getByRole('link', { name: /カラビナ/ }).first()).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: 'e2e/screens/browse.png', fullPage: true });
});

test('総数一覧:合計数で並べ替え', async ({ page }) => {
  await page.goto('./#/totals');
  await page.getByRole('button', { name: '合計数順' }).click();
  const first = Number(await page.getByTestId('row-total').first().textContent().then((t) => t!.match(/\d+/)![0]));
  const second = Number(await page.getByTestId('row-total').nth(1).textContent().then((t) => t!.match(/\d+/)![0]));
  expect(first).toBeGreaterThanOrEqual(second);
  await noHorizontalScroll(page);
});

test('車両ページ:場所ごとの積載品一覧', async ({ page }) => {
  await page.goto('./#/vehicle/pump1');
  await expect(page.getByRole('heading', { name: '信楽ポンプ1' })).toBeVisible();
  await expect(page.getByText('キャビン前部').first()).toBeVisible();
  await noHorizontalScroll(page);
});
