import { test, expect } from '@playwright/test';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const api = `http://127.0.0.1:${process.env.E2E_API_PORT || '18080'}/api`;
for (const width of [320, 1440]) {
  test(`edit actual video metadata with keyboard at ${width}px`, async ({ page }, testInfo) => {
    const files: string[] = [];
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#videos/101/edit');
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    // Registration and mutations use the same browser cookie jar as the UI.
    async function mutate(path: string, data: unknown) {
      const csrf = await (await page.request.get(`${api}/auth/csrf`)).json();
      return page.request.post(`${api}${path}`, { data, headers: { [csrf.headerName]: csrf.token } });
    }
    const registered = await mutate('/auth/register', {
      displayName: 'Editor',
      email: `editor-${width}-${Date.now()}@example.com`,
      password: 'Password1!',
      confirmPassword: 'Password1!',
    });
    expect(registered.status()).toBe(201);
    await page.reload();
    await expect(page.getByText('Hola, Editor')).toBeVisible();
    const csrf = await (await page.request.get(`${api}/auth/csrf`)).json();
    const uploaded = await page.request.post(`${api}/videos`, {
      headers: { [csrf.headerName]: csrf.token },
      multipart: {
        title: 'Initial editing title',
        description: 'Initial description',
        video: { name: 'video.mp4', mimeType: 'video/mp4', buffer: Buffer.from([1, 2, 3]) },
        thumbnail: { name: 'thumbnail.webp', mimeType: 'image/webp', buffer: Buffer.from([4, 5, 6]) },
      },
    });
    expect(uploaded.status()).toBe(201);
    const { id } = await uploaded.json();
    const detail = await (await page.request.get(`${api}/videos/${id}`)).json();
    files.push(detail.videoUrl.split('/').at(-1), detail.thumbnailUrl.split('/').at(-1));
    try {
      await page.goto(`/#videos/${id}/edit`);
      await expect(page.getByLabel('Título *')).toHaveValue('Initial editing title');
      await expect(page.getByLabel('Descripción *')).toHaveValue('Initial description');
      await expect(page.getByLabel('Categoría (opcional)')).toHaveValue('');
      await page.getByLabel('Título *').fill('');
      await page.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(page.getByLabel('Título *')).toBeFocused();
      const title = `Edited ${width} ${Date.now()}`;
      await page.keyboard.type(title);
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Descripción *')).toBeFocused();
      await page.getByLabel('Descripción *').fill('Updated description');
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Etiquetas (opcional)')).toBeFocused();
      await page.keyboard.type('viaje\na,b\nviaje');
      await page.keyboard.press('Tab');
      await expect(page.getByLabel('Categoría (opcional)')).toBeFocused();
      await page.keyboard.press('m');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await page.screenshot({ path: testInfo.outputPath(`editing-${width}.png`), fullPage: true });
      const patched = page.waitForResponse(
        (r) => r.request().method() === 'PATCH' && r.url().endsWith(`/videos/${id}`)
      );
      await page.keyboard.press('Enter');
      expect((await patched).status()).toBe(200);
      await expect(page.getByRole('status')).toHaveText('Cambios guardados correctamente.');
      await expect(page.getByRole('status')).toBeFocused();
      await expect(page.getByText('Categoría: Music')).toBeVisible();
      const saved = await (await page.request.get(`${api}/videos/${id}`)).json();
      expect(saved).toMatchObject({
        title,
        description: 'Updated description',
        tags: ['viaje', 'a,b'],
        category: { id: 1, name: 'Music' },
      });
      await page.getByRole('button', { name: 'Ver vídeo actualizado' }).click();
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(page.getByText('Updated description')).toBeVisible();
      await expect(page.getByText('Music', { exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Editar vídeo' })).toBeVisible();
      await page.getByRole('link', { name: 'Editar vídeo' }).click();
      await expect(page.getByLabel('Etiquetas (opcional)')).toHaveValue('viaje\na,b');
      await page.getByLabel('Título *').fill('Discard this');
      let writes = 0;
      page.on('request', (r) => {
        if (r.method() === 'PATCH') writes++;
      });
      await page.getByRole('button', { name: 'Cancelar' }).click();
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      expect(writes).toBe(0);
      await page.screenshot({ path: testInfo.outputPath(`edited-detail-${width}.png`), fullPage: true });
      await page.goto('/#videos/101/edit');
      await expect(page.getByRole('alert')).toHaveText('Solo puedes editar vídeos propios.');
      await expect(page.getByLabel('Título *')).toHaveCount(0);
      await page.goto('/#videos/9223372036854775807/edit');
      await expect(page.getByRole('alert')).toHaveText('Vídeo no encontrado o no disponible.');
      await expect(page.getByLabel('Título *')).toHaveCount(0);
    } finally {
      for (const filename of files) {
        expect(filename).toMatch(/^[a-f0-9-]{36}\.(mp4|webp)$/);
        await unlink(resolve('../backend/src/test/resources/e2e-media', filename));
      }
    }
  });
}
