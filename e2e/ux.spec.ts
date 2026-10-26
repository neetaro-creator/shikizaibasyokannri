import { expect, test } from '@playwright/test';

test('検索結果に場所と数の内訳が出る', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('カラビナ');
  const first = page.getByTestId('result').first();
  await expect(first).toContainText('車両左側後部シャッター 下段');
  await expect(first).toContainText('5');
});

test('一覧を開いたままでも、‹ で末尾の場所へ移れる(× で閉じればボタンも押せる)', async ({ page }) => {
  await page.goto('./#/vehicle/command1');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  const buttons = page.locator('[data-loc]');
  const last = await buttons.last().getAttribute('data-loc');
  await buttons.first().click();
  await expect(page.getByTestId('sheet')).toBeVisible();
  await page.getByRole('button', { name: '前の場所' }).click(); // 先頭から ‹ で末尾へ
  await expect(page).toHaveURL(new RegExp(`loc=${last}`));
  await page.getByRole('button', { name: '閉じる' }).click();
  await buttons.first().click({ timeout: 3000 });
  await expect(buttons.first()).toHaveClass(/on/);
});

test('戻ると一覧のスクロール位置が戻る', async ({ page }) => {
  await page.goto('./#/totals');
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(300);
  const y = await page.evaluate(() => window.scrollY);
  expect(y).toBeGreaterThan(1000);
  await page.locator('[data-testid=row-total]').nth(40).click();
  await expect(page).toHaveURL(/#\/item\//);
  await page.goBack();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 100);
});
