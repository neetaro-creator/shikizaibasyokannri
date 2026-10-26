import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = ['./', './#/item/i0001', './#/browse?cat=救助', './#/vehicle', './#/totals', './#/vehicle/tank1?loc=tank1-l25'];

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`a11y ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    for (const url of pages) {
      test(`${url} has no serious axe violations`, async ({ page }) => {
        await page.goto(url);
        await page.waitForTimeout(400);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      });
    }
  });
}
