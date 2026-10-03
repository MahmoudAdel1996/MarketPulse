import { test, expect } from '@playwright/test';

test('theme toggle persists across reloads without a light flash', async ({ page }) => {
  await page.goto('/instruments');
  const toggle = page.getByRole('button', { name: /^Theme:/ });
  // Each click cycles one step; wait for the label to update before deciding to click again.
  for (let i = 0; i < 3 && (await toggle.getAttribute('aria-label')) !== 'Theme: Dark'; i++) {
    const before = await toggle.getAttribute('aria-label');
    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-label', before!);
  }
  await expect(toggle).toHaveAttribute('aria-label', 'Theme: Dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Record the theme of every painted frame during the reload: the first paint must already be dark.
  await page.addInitScript(() => {
    const frames: string[] = [];
    (window as unknown as { __themes: string[] }).__themes = frames;
    const sample = () => {
      frames.push(document.documentElement.dataset['theme'] ?? 'none');
      if (frames.length < 60) {
        requestAnimationFrame(sample);
      }
    };
    requestAnimationFrame(sample);
  });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __themes: string[] }).__themes.length)).toBeGreaterThan(5);
  const frames = await page.evaluate(() => (window as unknown as { __themes: string[] }).__themes);
  expect(frames[0]).toBe('dark');
  expect(frames).not.toContain('light');
  expect(frames).not.toContain('none');
});
