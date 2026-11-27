import { expect, test } from '@playwright/test';

test('el tema sigue al sistema y recuerda las elecciones hechas con el teclado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#buscar');
  const selector = page.getByRole('combobox', { name: 'Tema' });
  const canvas = page.locator('body');
  const dark = 'rgb(16, 23, 19)';
  const light = 'rgb(246, 248, 245)';
  await expect(selector).toHaveValue('system');
  await expect(selector).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(canvas).toHaveCSS('background-color', dark);

  const query = page.getByRole('searchbox');
  await query.fill('ProTube');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(canvas).toHaveCSS('background-color', light);
  await expect(query).toHaveValue('ProTube');

  await page.getByRole('link', { name: 'Registrarse' }).focus();
  await page.keyboard.press('Tab');
  await expect(selector).toBeFocused();
  await expect(selector).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('End');
  await expect(selector).toHaveValue('dark');
  await expect(canvas).toHaveCSS('background-color', dark);
  await expect(selector).toHaveCSS('outline-color', 'rgb(154, 230, 188)');
  await page.reload();
  await expect(selector).toHaveValue('dark');
  await expect(canvas).toHaveCSS('background-color', dark);

  await selector.selectOption('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(canvas).toHaveCSS('background-color', light);
  await page.reload();
  await expect(selector).toHaveValue('light');
  await expect(canvas).toHaveCSS('background-color', light);

  await selector.selectOption('system');
  await expect(canvas).toHaveCSS('background-color', dark);
  await page.reload();
  await expect(selector).toHaveValue('system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(canvas).toHaveCSS('background-color', light);
});
