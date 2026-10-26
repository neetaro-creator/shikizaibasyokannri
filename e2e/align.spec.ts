import { expect, test } from '@playwright/test';

const FORMAT = /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){5}$/;

test('位置合わせモード:x を +0.1 すると CSV 用の文字列が変わる', async ({ page }) => {
  await page.goto('./#/vehicle/pump1?align=1');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: '車両右側前シャッター内' }).click();
  const text = page.getByTestId('hotspot-text');
  const before = await text.inputValue();
  expect(before).toMatch(FORMAT);
  await page.getByRole('button', { name: 'x を増やす' }).click();
  const after = await text.inputValue();
  expect(after).toMatch(FORMAT);
  expect(Number(after.split(',')[0])).toBeCloseTo(Number(before.split(',')[0]) + 0.1, 5);
  // 場所を選び直しても位置合わせモードのまま
  await expect(page).toHaveURL(/align=1/);
});

test('通常表示では位置合わせパネルは出ない', async ({ page }) => {
  await page.goto('./#/vehicle/pump1');
  await page.getByRole('button', { name: '車両右側前シャッター内' }).click();
  await expect(page.getByTestId('hotspot-text')).toHaveCount(0);
});
