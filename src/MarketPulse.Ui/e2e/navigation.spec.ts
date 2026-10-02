import { test, expect } from '@playwright/test';

test('signed-out users are sent to login with a return url', async ({ page }) => {
  await page.goto('/watchlists');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fwatchlists/);
});

test('unknown routes show the not-found page with status 404', async ({ page }) => {
  const response = await page.goto('/does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('instrument pages render on the server through the /api proxy', async ({ request }) => {
  const response = await request.get('/instruments?search=SHIB');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('SHIBUSD');
});

test('tiny crypto prices keep their precision', async ({ page }) => {
  await page.goto('/instruments?search=SHIB');
  await expect(page.getByRole('cell', { name: '0.00001734' })).toBeVisible();
});
