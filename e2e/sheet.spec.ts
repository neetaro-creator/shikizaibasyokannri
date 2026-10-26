import { expect, test } from '@playwright/test';

const open = async (page: import('@playwright/test').Page, loc: string) => {
  await page.goto(`./#/vehicle/tank1?loc=${loc}`);
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('sheet')).toBeVisible();
};
const order = (page: import('@playwright/test').Page) =>
  page.locator('[data-loc]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.loc!));

test('車両画面は上半分が3D、下半分が一覧で重ならない(ポップアップなし)', async ({ page }) => {
  await page.goto('./#/vehicle/tank1');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  const vh = await page.evaluate(() => window.innerHeight);
  const viewer = (await page.getByTestId('viewer').boundingBox())!;
  const pane = (await page.getByTestId('pane').boundingBox())!;
  const tabs = (await page.locator('nav.tabs').boundingBox())!;
  expect(viewer.height).toBeGreaterThan(vh * 0.3);
  expect(viewer.height).toBeLessThan(vh * 0.55);
  expect(Math.abs(pane.y - (viewer.y + viewer.height))).toBeLessThan(2);
  expect(pane.y + pane.height).toBeLessThanOrEqual(tabs.y + 1);
  expect(pane.height).toBeGreaterThan(vh * 0.3);
  await expect(page.locator('[data-loc]').first()).toBeVisible(); // 最初は場所の一覧
  await expect(page.getByTestId('sheet')).toBeHidden();
});

test('一覧の場所を押すと下半分が中身に切り替わり、≡ で場所の一覧に戻る', async ({ page }) => {
  await page.goto('./#/vehicle/tank1');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-loc="tank1-l21"]').click();
  await expect(page.getByTestId('sheet')).toBeVisible();
  await expect(page.getByTestId('sheet')).toContainText('吸管スパナ');
  await expect(page.locator('[data-loc="tank1-l21"]')).toBeHidden();
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-highlight', 'tank1-l21');
  await page.getByRole('button', { name: '場所の一覧へ' }).click();
  await expect(page.locator('[data-loc="tank1-l21"]')).toBeVisible();
  await expect(page.getByTestId('viewer')).not.toHaveAttribute('data-highlight', /.+/);
  await expect(page).not.toHaveURL(/loc=/);
});

test('車両画面はページ全体がスクロールせず、下半分の外のスワイプは打ち消す', async ({ page }) => {
  await open(page, 'tank1-l21');
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(1);
  const prevented = await page.evaluate(() => {
    const ev = new TouchEvent('touchmove', { cancelable: true, bubbles: true, touches: [] });
    document.querySelector('header')!.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
  expect(prevented).toBe(true);
  expect(await page.getByTestId('pane').evaluate((e) => getComputedStyle(e).overscrollBehaviorY)).toBe('contain');
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
  await expect(page).toHaveURL(new RegExp(`loc=${ids[i + 1]}$`));
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
