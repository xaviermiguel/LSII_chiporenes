import { test, expect } from '@playwright/test';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const uploadedFiles = new Set<string>();
test.afterEach(async () => {
  // Only the UUID files created by this worker, inside the isolated fixture store.
  const store = resolve('../backend/src/test/resources/e2e-media');
  for (const filename of uploadedFiles) {
    if (!/^[a-f0-9-]{36}\.(mp4|webp)$/.test(filename)) throw new Error('Unexpected uploaded fixture path');
    await unlink(resolve(store, filename));
  }
  uploadedFiles.clear();
});

for (const width of [320, 1440]) {
  test(`publish through real API, find in catalog, open and play at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/#upload');
    await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible();
    await page.getByRole('link', { name: 'Registrarse', exact: true }).first().click();
    await page.getByLabel('Nombre de usuario *').fill('Publisher');
    await page.getByLabel('Email *').fill(`publish-${width}-${Date.now()}@example.com`);
    await page.getByLabel('Contraseña *', { exact: true }).fill('Password1!');
    await page.getByLabel('Confirmar contraseña *').fill('Password1!');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Hola, Publisher')).toBeVisible();
    // Generate an actual MP4 using Chromium's existing media APIs; no mocked media responses.
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const context = canvas.getContext('2d')!;
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
      const chunks: BlobPart[] = [];
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.start();
      const timer = window.setInterval(() => {
        context.fillStyle = '#166344';
        context.fillRect(0, 0, 160, 90);
      }, 50);
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      recorder.stop();
      await stopped;
      window.clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/mp4' }).arrayBuffer()));
    });
    await page.getByRole('link', { name: 'Publicar vídeo' }).click();
    await page.getByRole('button', { name: 'Publicar vídeo' }).click();
    await expect(page.getByLabel('Archivo de vídeo *')).toBeFocused();
    await page
      .getByLabel('Archivo de vídeo *')
      .setInputFiles({ name: 'publication.mp4', mimeType: 'video/mp4', buffer: Buffer.from(bytes) });
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Título *')).toBeFocused();
    const title = `Published ${width} ${Date.now()}`;
    await page.keyboard.type(title);
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Descripción *')).toBeFocused();
    await page.keyboard.type('Vídeo publicado desde el formulario real.');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Tags (opcional)')).toBeFocused();
    await page.keyboard.type(' música, viajes, música, , ');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Publicar vídeo' })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`publication-${width}.png`), fullPage: true });
    const created = page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/api\/videos$/.test(response.url())
    );
    await page.keyboard.press('Enter');
    const response = await created;
    expect(response.status()).toBe(201);
    const published = await response.json();
    const stored = await (await page.request.get(response.url() + '/' + published.id)).json();
    expect(stored.tags).toEqual(['música', 'viajes']);
    for (const url of [stored.videoUrl, stored.thumbnailUrl]) uploadedFiles.add(url.split('/').at(-1));
    expect(published).toMatchObject({ title, description: 'Vídeo publicado desde el formulario real.' });
    await expect(page.getByRole('heading', { name: 'Vídeo publicado' })).toBeFocused();
    await expect(page.getByRole('status')).toContainText(title);
    await page.getByRole('button', { name: 'Ver vídeo publicado' }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByText('música', { exact: true })).toBeVisible();
    await expect(page.getByText('viajes', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Volver al catálogo' }).click();
    const card = page.getByRole('button', { name: title, exact: true });
    while (!(await card.count()) && (await page.getByRole('button', { name: 'Cargar más' }).count())) {
      await page.getByRole('button', { name: 'Cargar más' }).click();
      await expect(page.getByRole('button', { name: 'Cargando más vídeos...' })).toHaveCount(0);
    }
    await expect(card).toBeVisible();
    await expect
      .poll(() => card.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    const detail = page.waitForResponse((result) => result.url().endsWith(`/api/videos/${published.id}`));
    await card.click();
    expect((await detail).ok()).toBeTruthy();
    const player = page.getByLabel(`Reproductor: ${title}`);
    await expect(player).toHaveAttribute('controls', '');
    await player.evaluate((element) => (element as HTMLVideoElement).play());
    await expect.poll(() => player.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    expect(await player.evaluate((element) => (element as HTMLVideoElement).error)).toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`published-playback-${width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Mis vídeos', exact: true }).click();
    await expect(page.getByRole('button', { name: `Ver ${title}`, exact: true })).toBeVisible();
    await page.getByRole('link', { name: `Editar ${title}`, exact: true }).click();
    const updatedTitle = `${title} editado`;
    await page.getByLabel('Título *').fill(updatedTitle);
    await page.getByLabel('Descripción *').fill('Descripción actualizada.');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('status')).toHaveText('Cambios guardados correctamente.');
    await page.reload();
    await expect(page.getByLabel('Título *')).toHaveValue(updatedTitle);
    await expect(page.getByLabel('Descripción *')).toHaveValue('Descripción actualizada.');
    await page.getByRole('link', { name: 'Mis vídeos', exact: true }).click();
    await expect(page.getByRole('button', { name: `Ver ${updatedTitle}`, exact: true })).toBeVisible();
  });
}
