import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { registerNewUser } from './helpers';

async function expectAccessible(page: Page) {
  // Let entry animations/transitions settle so contrast is measured on final colours.
  await page.waitForLoadState('networkidle');
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('mp-theme', t), theme);
    });

    test('public pages pass axe (including colour contrast)', async ({ page, request }) => {
      await page.goto('/instruments');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expectAccessible(page);

      const list = await (await request.get('/api/v1/instruments?search=EURUSD')).json();
      await page.goto(`/instruments/${list.items[0].id}`);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('EURUSD');
      await expectAccessible(page);
    });

    test('account pages pass axe (including colour contrast)', async ({ page }) => {
      await registerNewUser(page);
      await page.goto('/watchlists');
      await expect(page.getByRole('heading', { name: 'Watchlists' })).toBeVisible();
      await expectAccessible(page);
      await page.goto('/alerts');
      await expect(page.getByRole('heading', { name: 'Price alerts' })).toBeVisible();
      await expectAccessible(page);
    });
  });
}
