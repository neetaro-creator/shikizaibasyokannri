import { expect, test } from '@playwright/test';

const open = async (page: import('@playwright/test').Page, loc: string) => {
  await page.goto(`./#/vehicle/tank1?loc=${loc}`);
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('sheet')).toBeVisible();
};
const order = (page: import('@playwright/test').Page) =>
  page.locator('[data-loc]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.loc!));

test('場所を選ぶと3Dは縦に詰まり、一覧が画面の半分近くまで広がる', async ({ page }) => {
  await open(page, 'tank1-l21');
  const vh = await page.evaluate(() => window.innerHeight);
  const viewer = (await page.getByTestId('viewer').boundingBox())!;
  const sheet = (await page.getByTestId('sheet').evaluate((e) => getComputedStyle(e).maxHeight));
  expect(viewer.height).toBeLessThan(vh * 0.4);
  expect(parseFloat(sheet)).toBeGreaterThan(vh * 0.45);
});

test('一覧を開いている間は背面がスクロールしない(一覧の外のスワイプは打ち消す)', async ({ page }) => {
  await open(page, 'tank1-l21');
  const prevented = await page.evaluate(() => {
    const ev = new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [] });
    document.querySelector('header')!.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(prevented).toBe(true);
  expect(await page.getByTestId('sheet').evaluate((e) => getComputedStyle(e).overscrollBehaviorY)).toBe('contain');
});

test('一覧を左右にスワイプすると次/前の場所が光る', async ({ page }) => {
  await open(page, 'tank1-l21');
  const ids = await order(page);
  const i = ids.indexOf('tank1-l21');
  const sheet = (await page.getByTestId('sheet').boundingBox())!;
  const y = sheet.y + sheet.height / 2;
  const swipe = async (from: number, to: number) => {
    await page.mouse.move(from, y);
    await page.mouse.down();
    await page.mouse.move(to, y + 5, { steps: 8 });
    await page.mouse.up();
  };
  await swipe(sheet.x + sheet.width * 0.8, sheet.x + sheet.width * 0.2); // 左へ → 次
  await expect(page.getByTestId('sheet')).toContainText(await page.locator(`[data-loc="${ids[i + 1]}"]`).innerText());
  await swipe(sheet.x + sheet.width * 0.2, sheet.x + sheet.width * 0.8); // 右へ → 前
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-highlight', ids[i]);
});

test('見出しの › ‹ ボタンでも場所を送れる', async ({ page }) => {
  await open(page, 'tank1-l21');
  const ids = await order(page);
  const i = ids.indexOf('tank1-l21');
  await page.getByRole('button', { name: '次の場所' }).click();
  await expect(page).toHaveURL(new RegExp(`loc=${ids[i + 1]}`));
  await page.getByRole('button', { name: '前の場所' }).click();
  await expect(page).toHaveURL(new RegExp(`loc=${ids[i]}`));
});
