import { expect, test } from '@playwright/test';

test('資器材の積載場所から3Dへ移ると、その場所が光る', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('カラビナ');
  await page.getByRole('link', { name: /^カラビナ/ }).first().click();
  await page.getByRole('link', { name: /車両左側後部シャッター 下段/ }).click();
  const viewer = page.getByTestId('viewer');
  await expect(viewer).toHaveAttribute('data-highlight', /^tank1-l\d+$/);
  await expect(page.getByTestId('sheet')).toContainText('車両左側後部シャッター 下段');
  await expect(page.getByTestId('sheet')).toContainText('カラビナ');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'e2e/screens/vehicle-highlight.png' });
});

test('3D上の場所をタップすると積載品一覧が出る', async ({ page }) => {
  await page.goto('./#/vehicle/pump1');
  const viewer = page.getByTestId('viewer');
  await expect(viewer).toHaveAttribute('data-ready', 'true');
  const target = await page.evaluate(() => {
    const api = (window as unknown as { __shikizai3d: { visible(): { id: string; x: number; y: number }[] } }).__shikizai3d;
    return api.visible()[0];
  });
  expect(target).toBeTruthy();
  await page.mouse.click(target.x, target.y);
  await expect(viewer).toHaveAttribute('data-highlight', target.id);
  await expect(page.getByTestId('sheet')).toBeVisible();
});

test('3Dに置かない場所(車外保管)を選んでも一覧で示される', async ({ page }) => {
  await page.goto('./#/vehicle/command1');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: '車庫西側' }).click();
  await expect(page.getByTestId('sheet')).toContainText('車庫西側');
  await expect(page.getByTestId('sheet')).toContainText('3D上には表示されません');
  await expect(page.getByTestId('viewer')).not.toHaveAttribute('data-highlight', /.+/);
});

test('キャブ内の場所を選ぶと車体が透けて中が見え、外の場所では元に戻る', async ({ page }) => {
  await page.goto('./#/vehicle/tank1?loc=tank1-l08');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-xray', 'true');
  await page.getByRole('button', { name: '閉じる' }).click();
  await page.getByRole('button', { name: '車両右側前部シャッター' }).click();
  await expect(page.getByTestId('viewer')).not.toHaveAttribute('data-xray', 'true');
});

test('キャブ内の場所も、車体の上からタップして選べる', async ({ page }) => {
  await page.goto('./#/vehicle/tank1');
  const viewer = page.getByTestId('viewer');
  await expect(viewer).toHaveAttribute('data-ready', 'true');
  await page.waitForTimeout(300);
  const p = await page.evaluate(() =>
    (window as unknown as { __shikizai3d: { project(id: string): { x: number; y: number } | undefined } }).__shikizai3d.project('tank1-l31'));
  expect(p).toBeTruthy();
  await page.mouse.click(p!.x, p!.y);
  await expect(viewer).toHaveAttribute('data-xray', 'true');
  await expect(viewer).toHaveAttribute('data-highlight', /^tank1-l/);
  await expect(page.getByTestId('sheet')).toBeVisible();
});
