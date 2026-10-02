import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers';

test('create, disable and delete an alert from an instrument page', async ({ page }) => {
  await registerNewUser(page);
  await page.goto('/instruments?search=EURUSD');
  await page.getByRole('link', { name: 'EURUSD' }).click();
  await page.getByRole('button', { name: 'Create alert' }).click();
  await page.getByLabel('Threshold').fill('1.2');
  await page.getByRole('dialog').getByRole('button', { name: 'Create alert' }).click();
  await expect(page.getByText('Alert created for EURUSD')).toBeVisible();

  await page.getByRole('link', { name: 'Alerts', exact: true }).click();
  const toggle = page.getByRole('switch', { name: /EURUSD/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('button', { name: 'Delete alert for EURUSD' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No alerts yet.')).toBeVisible();
});
