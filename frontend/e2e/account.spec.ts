import { test, expect } from '@playwright/test';

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
    await expect(page.getByText('Hola, Profile')).toBeVisible();
    await page.getByRole('link', { name: 'Mi cuenta' }).click();
    await page.getByLabel('Nombre de usuario *').fill('Mi perfil');
    await page.getByLabel('Email *').fill(updatedEmail);
    await page.getByLabel('Descripción', { exact: true }).fill('Mi descripción pública.');
    await page.getByRole('button', { name: 'Guardar perfil' }).click();
    await expect(page.getByRole('status')).toHaveText('Perfil actualizado.');
    await expect(page.getByText('Hola, Mi perfil')).toBeVisible();
    await page.reload();
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
    await expect(page.getByText('Hola, Mi perfil')).toHaveCount(0);
    await page.getByLabel('Email *').fill(updatedEmail);
    await page.getByLabel('Contraseña *', { exact: true }).fill('New-password1!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Hola, Mi perfil')).toBeVisible();
    await page.getByRole('link', { name: 'Mis vídeos', exact: true }).click();
    await expect(page.getByText('Todavía no has publicado ningún vídeo.')).toBeVisible();
  });
}
