import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers';

test('register, create a watchlist and add an instrument', async ({ page }) => {
  await registerNewUser(page);
  await page.getByRole('link', { name: 'Watchlists' }).click();
  await page.getByRole('button', { name: 'New watchlist' }).click();
  await page.getByLabel('Name').fill('Metals');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Metals' })).toBeVisible();

  await page.getByRole('combobox', { name: 'Add instrument' }).fill('XAU');
  await page.getByRole('option', { name: /XAUUSD/ }).click();
  await expect(page.getByRole('cell', { name: 'XAUUSD', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Remove XAUUSD' }).click();
  await expect(page.getByText('This watchlist is empty')).toBeVisible();
});
