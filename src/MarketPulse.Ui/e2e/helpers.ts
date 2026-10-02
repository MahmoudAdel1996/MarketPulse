import { Page, expect } from '@playwright/test';

export async function registerNewUser(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('P@ssword123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(email)).toBeVisible();
  return email;
}
