import { expect, test } from '@playwright/test';

test('一度開けば、通信を切っても検索と3Dが動く', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    }
    return reg.active?.state;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('searchbox').fill('カラビナ');
  await expect(page.getByRole('link', { name: /^カラビナ/ }).first()).toBeVisible();
  await page.goto('./#/vehicle/tank1');
  await expect(page.getByTestId('viewer')).toHaveAttribute('data-ready', 'true');
});
