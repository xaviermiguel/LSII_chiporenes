import { test, expect } from '@playwright/test';

for (const width of [320, 1440]) {
  test(`real authentication with keyboard at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const email = `auth-${width}-${Date.now()}-${testInfo.retry}@example.com`;
    const password = 'Test-password1!';
    await page.goto('/#register');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByLabel('Nombre de usuario *')).toBeFocused();
    await expect(page.getByText('Este campo es obligatorio.')).toHaveCount(4);
    await page.keyboard.type('Anna');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Email *')).toBeFocused();
    await page.keyboard.type(email);
    await page.keyboard.press('Tab');
    await page.keyboard.type(password);
    await page.keyboard.press('Tab');
    await page.keyboard.type(password);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`register-${width}.png`), fullPage: true });
    await page.keyboard.press('Enter');
    await expect(page.getByText('Hola, Anna')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Descubre algo nuevo.' })).toBeVisible();
    await expect(page).toHaveURL(/#contenido$/);
    await page.reload();
    await expect(page.getByText('Hola, Anna')).toBeVisible();
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(storage).not.toContain(password);
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('link', { name: 'Registrarse' })).toBeVisible();

    await page.getByRole('link', { name: 'Registrarse' }).click();
    await page.getByLabel('Nombre de usuario *').fill('Anna');
    await page.getByLabel('Email *').fill(email);
    await page.getByLabel('Contraseña *', { exact: true }).fill(password);
    await page.getByLabel('Confirmar contraseña *').fill(password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('alert')).toHaveText('El email ya está registrado.');
    await expect(page.getByLabel('Email *')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Contraseña *', { exact: true })).toHaveValue('');
    await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).last().click();
    await page.getByLabel('Email *').fill(email);
    await page.getByLabel('Contraseña *', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos.');
    await expect(page.getByLabel('Contraseña *', { exact: true })).toHaveValue('');
    await page.getByLabel('Contraseña *', { exact: true }).fill(password);
    await page.screenshot({ path: testInfo.outputPath(`login-${width}.png`), fullPage: true });
    await page.getByLabel('Contraseña *', { exact: true }).press('Enter');
    await expect(page.getByText('Hola, Anna')).toBeVisible();
    await expect(page).toHaveURL(/#contenido$/);
  });
}

test('pending authentication cannot submit twice; network error permits retry', async ({ page }) => {
  await page.goto('/#login');
  await page.getByLabel('Email *').fill('offline@example.com');
  await page.getByLabel('Contraseña *', { exact: true }).fill('Password1!');
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/login', async (route) => {
    requests++;
    await pending;
    await route.abort();
  });
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
  await page.getByLabel('Contraseña *', { exact: true }).dispatchEvent('keydown', { key: 'Enter' });
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(page.getByRole('alert')).toContainText('Comprueba tu conexión');
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeEnabled();
});
