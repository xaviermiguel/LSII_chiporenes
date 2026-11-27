import { expect, test } from '@playwright/test';

test('el tema sigue al sistema y recuerda las elecciones hechas con el teclado', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route('**/api/auth/me', (route) => route.fulfill({ status: 401, json: {} }));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/#buscar');
  const selector = page.getByRole('button', { name: /^Tema:/ });
  const menu = page.getByRole('menu', { name: 'Tema' });
  const canvas = page.locator('body');
  const dark = 'rgb(16, 23, 19)';
  const light = 'rgb(246, 248, 245)';
  await expect(selector).toHaveAccessibleName('Tema: Sistema');
  await expect(selector).toHaveText('');
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
  await page.keyboard.press('Enter');
  await expect(menu.getByRole('menuitemradio', { name: 'Sistema', checked: true })).toBeFocused();
  await expect(menu).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(selector).toBeFocused();
  await expect(selector).toHaveAccessibleName('Tema: Oscuro');
  await expect(canvas).toHaveCSS('background-color', dark);
  await expect(selector).toHaveCSS('outline-color', 'rgb(154, 230, 188)');
  await page.reload();
  await expect(selector).toHaveAccessibleName('Tema: Oscuro');
  await expect(canvas).toHaveCSS('background-color', dark);

  await selector.click();
  await expect(menu.getByRole('menuitemradio', { name: 'Oscuro', checked: true })).toBeFocused();
  await menu.getByRole('menuitemradio', { name: 'Claro' }).click();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(canvas).toHaveCSS('background-color', light);
  await page.reload();
  await expect(selector).toHaveAccessibleName('Tema: Claro');
  await expect(canvas).toHaveCSS('background-color', light);

  await selector.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(selector).toBeFocused();
  await selector.click();
  await query.click();
  await expect(menu).toBeHidden();
  await selector.click();
  await menu.getByRole('menuitemradio', { name: 'Sistema' }).click();
  await expect(canvas).toHaveCSS('background-color', dark);
  await page.reload();
  await expect(selector).toHaveAccessibleName('Tema: Sistema');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(canvas).toHaveCSS('background-color', light);
});
