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
  await expect(page.getByTestId('per-vehicle').locator('.vtag', { hasText: 'タンク1' })).toBeVisible();
  await expect(page.getByText('車両左側後部シャッター 下段')).toBeVisible();
  await noHorizontalScroll(page);
  await page.screenshot({ path: 'e2e/screens/item.png', fullPage: true });
});

test('分類(旧「探す」)を選ぶと品が並ぶ', async ({ page }) => {
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

test('詳細:合計は数字+数で書かれていない分の中身、車両ごとは数を並べるだけ(横棒なし)', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('油粘土');
  await page.getByTestId('result').first().click();
  await expect(page.getByTestId('total')).toHaveText('2');
  await expect(page.getByTestId('total-extra')).toContainText('適量');
  await expect(page.getByTestId('total-extra')).toContainText('3以上');
  await expect(page.getByText('内訳参照')).toHaveCount(0);
  await expect(page.locator('.bar')).toHaveCount(0);
  await expect(page.getByTestId('per-vehicle')).toContainText('タンク1');
  await expect(page.getByTestId('per-vehicle')).toContainText('適量');
  await page.screenshot({ path: 'e2e/screens/item-total.png', fullPage: true });
});

test('検索と探すは一つの画面:タブは3つ、検索画面は分類と車両の絞り込みだけ(よく探す品・車両の場所は出さない)', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('nav.tabs a')).toHaveText(['検索', '車両', '総数']);
  await page.getByRole('button', { name: /救助/ }).click();
  await expect(page).toHaveURL(/cat=/);
  await expect(page.locator('.grid .card').first()).toBeVisible();
  await expect(page.getByRole('checkbox', { name: '信楽タンク1' })).toBeVisible();
  await expect(page.getByText('よく探す品')).toHaveCount(0);
  await expect(page.getByText('車両の場所から')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /信楽タンク1/ })).toHaveCount(0);
  // 入力すると検索結果に切り替わり、分類の一覧は隠れる
  await page.getByRole('searchbox').fill('カラビナ');
  await expect(page.getByTestId('result').first()).toBeVisible();
  await expect(page.locator('.grid .card')).toHaveCount(0);
});

test('以前の「探す」のURLは検索画面の分類表示につながる', async ({ page }) => {
  await page.goto('./#/browse?cat=救助');
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.locator('.grid .card').first()).toBeVisible();
});

test('車両をチェックすると、その車両に積んでいる品と場所だけで検索できる', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('checkbox', { name: '信楽救急1' }).check();
  await page.getByRole('searchbox').fill('カラビナ');
  await expect(page.getByTestId('result')).toHaveCount(0);
  await page.getByRole('searchbox').fill('ガーゼ');
  const results = page.getByTestId('result');
  await expect(results.first()).toBeVisible();
  const tags = await page.getByTestId('result').locator('.vtag').allTextContents();
  expect(tags.length).toBeGreaterThan(0);
  expect(tags.every((t) => t === '救急1')).toBe(true);
  await page.getByRole('checkbox', { name: '信楽救急1' }).uncheck();
  await page.getByRole('searchbox').fill('カラビナ');
  await expect(results.first()).toBeVisible();
});
