import { test, expect } from '@playwright/test';

test('Mis vídeos appends on approach, preserves the reading position and retries the failed page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 650 });
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { id: 12, displayName: 'Ana', email: 'ana@example.com' } })
  );
  const requests: number[] = [];
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let failed = false;
  await page.route('**/api/videos/me?*', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const number = Number(params.get('page'));
    requests.push(number);
    if (number === 1) await pending;
    if (number === 2 && !failed) {
      failed = true;
      await route.fulfill({ status: 503, json: {} });
      return;
    }
    const start = [1, 12, 24][number];
    const items = Array.from({ length: number === 2 ? 1 : 12 }, (_, index) => ({
      id: start + index,
      title: `Clip ${start + index}`,
      user: 'Ana',
      duration: 10,
      thumbnailUrl: '/media/fixture.webp',
    }));
    await route.fulfill({ json: { items, page: number, size: 12, hasNext: number < 2 } });
  });
  await page.goto('/#my-videos');
  const cards = page.getByRole('list', { name: 'Tus vídeos' }).getByRole('listitem');
  await expect(cards).toHaveCount(12);
  // Stop just before the footer enters the viewport.
  await page
    .locator('.catalog-footer')
    .evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - innerHeight - 80));
  await expect(page.getByRole('status')).toHaveText('Cargando más vídeos...');
  const position = await page.evaluate(() => scrollY);
  release();
  await expect(cards).toHaveCount(23);
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await page.locator('.catalog-footer').scrollIntoViewIfNeeded();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(cards).toHaveCount(23);
  await page.getByRole('button', { name: 'Reintentar' }).press('Enter');
  await expect(page.getByRole('status')).toHaveText('No hay más vídeos.');
  await expect(cards.getByRole('button')).toHaveText(Array.from({ length: 24 }, (_, index) => `Clip ${index + 1}`));
  await expect(page.getByRole('button', { name: /Cargar más|Anterior|Siguiente/ })).toHaveCount(0);
  expect(requests.filter((number) => number !== 0)).toEqual([1, 2, 2]);
});

for (const width of [320, 1440]) {
  test(`edit profile, persist, change password and login again at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const email = `profile-${width}-${Date.now()}@example.com`;
    const updatedEmail = `updated-${width}-${Date.now()}@example.com`;
    await page.goto('/#profile');
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    await page.getByRole('link', { name: 'Registrarse', exact: true }).first().click();
    await page.getByLabel('Nombre de usuario *').fill('Profile');
    await page.getByLabel('Email *').fill(email);
    await page.getByLabel('Contraseña *', { exact: true }).fill('Password1!');
    await page.getByLabel('Confirmar contraseña *').fill('Password1!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('link', { name: 'Mi cuenta' })).toBeVisible();
    await page.getByRole('link', { name: 'Mi cuenta' }).click();
    await page.getByLabel('Nombre de usuario *').fill('Mi perfil');
    await page.getByLabel('Email *').fill(updatedEmail);
    await page.getByLabel('Descripción', { exact: true }).fill('Mi descripción pública.');
    await page.getByRole('button', { name: 'Guardar perfil' }).click();
    await expect(page.getByRole('status')).toHaveText('Perfil actualizado.');
    await page.reload();
    await expect(page.getByLabel('Nombre de usuario *')).toHaveValue('Mi perfil');
    await expect(page.getByLabel('Email *')).toHaveValue(updatedEmail);
    await expect(page.getByLabel('Descripción', { exact: true })).toHaveValue('Mi descripción pública.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`account-${width}.png`), fullPage: true });
    await page.getByLabel('Contraseña actual *').fill('Incorrect1!');
    await page.getByLabel('Nueva contraseña *', { exact: true }).fill('New-password1!');
    await page.getByLabel('Confirmar nueva contraseña *').fill('New-password1!');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('alert')).toHaveText('La contraseña actual no es correcta.');
    await expect(page.getByLabel('Contraseña actual *')).toHaveValue('');
    await page.getByLabel('Contraseña actual *').fill('Password1!');
    await page.getByLabel('Nueva contraseña *', { exact: true }).fill('New-password1!');
    await page.getByLabel('Confirmar nueva contraseña *').fill('New-password1!');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Mi cuenta' })).toHaveCount(0);
    await page.getByLabel('Email *').fill(updatedEmail);
    await page.getByLabel('Contraseña *', { exact: true }).fill('New-password1!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('link', { name: 'Mi cuenta' })).toBeVisible();
    await page.getByRole('link', { name: 'Mis vídeos', exact: true }).click();
    await expect(page.getByText('Todavía no has publicado ningún vídeo.')).toBeVisible();
  });
}
