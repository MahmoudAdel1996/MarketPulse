import { test, expect } from '@playwright/test';

test('detail chart switches ranges and supports the keyboard', async ({ page, request }) => {
  const list = await (await request.get('/api/v1/instruments?search=EURUSD')).json();
  const id = list.items[0].id as string;
  const response = await request.get(`/api/v1/instruments/${id}/history?range=24h`);
  const history = response.ok() ? await response.json() : { points: [] };
  test.skip(!history.points?.length, 'No price history: restart the API, start InfluxDB and set InfluxDb:Token (see README)');

  await page.goto(`/instruments/${id}`);
  const chart = page.getByRole('img', { name: /last 24 hours/ });
  await expect(chart).toBeVisible();

  await page.getByRole('button', { name: '7D' }).click();
  await expect(page).toHaveURL(/range=7d/);
  await expect(page.getByRole('img', { name: /last 7 days/ })).toBeVisible();

  await page.getByRole('img', { name: /last 7 days/ }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: /\d/ }).first()).not.toBeEmpty();

  await page.goto('/instruments?search=EURUSD');
  await expect(page.getByTestId('change').first()).toHaveText(/% 24h/);
});
