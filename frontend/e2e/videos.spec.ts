import { test, expect } from '@playwright/test';

const api = `http://127.0.0.1:${process.env.E2E_API_PORT || '18080'}`;

test('real API returns paginated fixtures without duplicates', async ({ request }) => {
  const first = await request.get(`${api}/api/videos?size=2`);
  expect(first.ok()).toBeTruthy();
  const firstPage = await first.json();
  expect(firstPage).toMatchObject({ page: 0, size: 2, hasNext: true });
  expect(firstPage.items.map((item: { id: number }) => item.id)).toEqual([101, 102]);
  const second = await request.get(`${api}/api/videos?page=1&size=2`);
  expect(second.ok()).toBeTruthy();
  expect(await second.json()).toMatchObject({ items: [{ id: 103 }], hasNext: false });
});

test('real API returns video detail, comments and HTTP media ranges', async ({ request }) => {
  const response = await request.get(`${api}/api/videos/101`);
  expect(response.ok()).toBeTruthy();
  const detail = await response.json();
  expect(detail).toMatchObject({
    id: 101,
    title: 'E2E first video',
    comments: expect.arrayContaining([expect.objectContaining({ text: 'E2E comment' })]),
  });
  const media = await request.get(`${api}${detail.videoUrl}`, { headers: { Range: 'bytes=0-2' } });
  expect(media.status()).toBe(206);
  expect((await media.body()).toString()).toBe('syn');
});

test('real API handles invalid pagination and unavailable videos', async ({ request }) => {
  const invalid = await request.get(`${api}/api/videos?page=-1`);
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toMatchObject({ code: 'INVALID_PAGINATION' });
  for (const id of [103, 999999]) {
    const missing = await request.get(`${api}/api/videos/${id}`);
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toMatchObject({ code: 'VIDEO_NOT_FOUND' });
  }
});

test('anonymous browser displays the real catalog and opens the persisted detail', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.video-card-title')).toHaveText([
    'E2E first video',
    'E2E second video',
    'E2E unavailable file',
  ]);
  await expect(page.getByRole('status')).toHaveText('No hay más vídeos.');
  await expect(page.getByRole('img', { name: 'logo' })).toBeVisible();
  const video = page.getByRole('button', { name: 'E2E first video' });
  await expect(video.locator('img')).toHaveAttribute('src', `${api}/media/fixture.webp`);
  const detail = page.waitForResponse(`${api}/api/videos/101`);
  await video.click();
  expect((await detail).ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'E2E first video' })).toBeVisible();
});

test('browser appends real API pages and stops at the end', async ({ page }) => {
  // Three isolated fixtures: request two per page without changing application
  // defaults or backend data. Every response still comes from the real API.
  const pages: string[] = [];
  await page.route('**/api/videos?*', async (route) => {
    const url = new URL(route.request().url());
    pages.push(url.searchParams.get('page')!);
    url.searchParams.set('size', '2');
    await route.continue({ url: url.href });
  });
  await page.goto('/');
  await expect(page.locator('.video-card-title')).toHaveText(['E2E first video', 'E2E second video']);
  await page.getByRole('button', { name: 'Cargar más' }).click();
  await expect(page.locator('.video-card-title')).toHaveText([
    'E2E first video',
    'E2E second video',
    'E2E unavailable file',
  ]);
  await expect(page.getByRole('status')).toHaveText('No hay más vídeos.');
  await expect(page.getByRole('button', { name: 'Cargar más' })).toHaveCount(0);
  // StrictMode can restart the initial request; subsequent pages are requested once.
  expect(pages.filter((number) => number === '1')).toHaveLength(1);
  expect(pages.every((number) => number === '0' || number === '1')).toBeTruthy();
});

test('browser displays a controlled request failure (mock API)', async ({ page }) => {
  await page.route('**/api/videos?*', (route) => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Error al cargar los vídeos');
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
});

test('anonymous visitor searches the real API by keyboard and opens the player at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: 'Buscar' }).click();
  const query = page.getByRole('searchbox', { name: 'Título o descripción' });
  await query.fill('first video');
  const search = page.waitForResponse((response) => response.url().includes('/api/videos/search?') && response.ok());
  await query.press('Enter');
  expect(new URL((await search).url()).searchParams.get('q')).toBe('first video');
  const results = page.getByRole('list', { name: 'Resultados para «first video»' });
  const result = results.getByRole('button', { name: 'E2E first video' });
  await expect(results.getByRole('listitem')).toHaveCount(1);
  await expect(result.locator('img')).toHaveAttribute('src', `${api}/media/fixture.webp`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await result.press('Enter');
  await expect(page.getByRole('heading', { name: 'E2E first video' })).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('src', `${api}/media/fixture.mp4`);
});

test('signs in to reply with the keyboard and sees the saved reply after reload', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 720 });
  const email = `reply-${Date.now()}-${testInfo.retry}@example.com`;
  const password = 'Test-password1!';
  const author = 'Violeta';
  const text = `<script>Respuesta ${email}</script>`;
  await page.goto('/#register');
  await page.getByLabel('Nombre de usuario *').fill(author);
  await page.getByLabel('Email *').fill(email);
  await page.getByLabel('Contraseña *', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña *').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();

  const video = page.getByRole('button', { name: 'E2E first video' });
  await video.click();
  const reply = page.getByRole('button', { name: 'Responder a Test commenter' });
  await reply.press('Enter');
  await expect(page.getByText('Inicia sesión para responder a este comentario.')).toBeFocused();
  await page.getByLabel('Email *').fill(email);
  await page.getByLabel('Contraseña *', { exact: true }).fill(password);
  await page.getByLabel('Contraseña *', { exact: true }).press('Enter');
  const editor = page.getByRole('textbox', { name: 'Responder a Test commenter' });
  await expect(editor).toBeFocused();
  await editor.fill(text);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const response = page.waitForResponse((result) => result.url().endsWith('/replies') && result.status() === 201);
  await editor.press('Tab');
  const send = page.getByRole('button', { name: 'Enviar respuesta' });
  await expect(send).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await (await response).json()).toMatchObject({ user: author, text, parentId: expect.any(Number) });

  const thread = page.getByRole('list', { name: 'Respuestas a Test commenter' });
  const saved = thread.getByRole('listitem').filter({ hasText: text });
  await expect(saved).toContainText(author);
  await expect(saved.locator('script')).toHaveCount(0);
  await page.reload();
  await video.click();
  await expect(saved).toContainText(author);
});

test('publishes a top-level comment as a viewer and finds it once after reload', async ({ page }) => {
  const email = `comment-${Date.now()}@example.com`;
  const author = 'Lector de ProTube';
  const text = `<b>Comentario de ${email}</b>`;
  await page.goto('/#register');
  await page.getByLabel('Nombre de usuario *').fill(author);
  await page.getByLabel('Email *').fill(email);
  await page.getByLabel('Contraseña *', { exact: true }).fill('Test-password1!');
  await page.getByLabel('Confirmar contraseña *').fill('Test-password1!');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  const video = page.getByRole('button', { name: 'E2E first video', exact: true });
  const detailResponse = page.waitForResponse(`${api}/api/videos/101`);
  await video.click();
  const { ownerId } = await (await detailResponse).json();
  const input = page.getByRole('textbox', { name: 'Escribe un comentario' });
  await input.fill(text);
  const confirmation = page.waitForResponse(
    (response) => response.url() === `${api}/api/videos/101/comments` && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Publicar comentario' }).click();
  const response = await confirmation;
  expect(response.status()).toBe(201);
  const saved = await response.json();
  expect(saved).toMatchObject({ text, user: author, authorId: expect.any(Number), parentId: null });
  expect(saved.authorId).not.toBe(ownerId);
  const rendered = page.locator('.video-comments > li').filter({ has: page.getByText(text, { exact: true }) });
  await expect(rendered).toHaveCount(1);
  await expect(rendered.getByRole('link', { name: author })).toHaveAttribute('href', `#users/${saved.authorId}`);
  await expect(input).toHaveValue('');
  await page.reload();
  await video.click();
  await expect(rendered).toHaveCount(1);
  await expect(rendered.getByRole('link', { name: author })).toBeVisible();
  await expect(rendered.locator('b')).toHaveCount(0);
});

test('adds and removes a comment like with the real API and restores it after reload', async ({ page }, testInfo) => {
  await page.goto('/#register');
  await page.getByLabel('Nombre de usuario *').fill('Violeta');
  await page.getByLabel('Email *').fill(`like-${Date.now()}-${testInfo.retry}@example.com`);
  await page.getByLabel('Contraseña *', { exact: true }).fill('Test-password1!');
  await page.getByLabel('Confirmar contraseña *').fill('Test-password1!');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();

  const video = page.getByRole('button', { name: 'E2E first video' });
  await video.click();
  const like = page.getByRole('button', { name: 'Me gusta el comentario de Test commenter' });
  await expect(like).toBeEnabled();
  await expect(like).toHaveAttribute('aria-pressed', 'false');

  const added = page.waitForResponse(
    (response) => response.url().endsWith('/likes') && response.request().method() === 'PUT'
  );
  await like.press('Enter');
  const put = await added;
  expect(put.ok()).toBeTruthy();
  const { likeCount } = await put.json();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(`${likeCount} Me gusta`, { exact: true })).toBeVisible();

  await page.reload();
  await video.click();
  await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(`${likeCount} Me gusta`, { exact: true })).toBeVisible();

  const removed = page.waitForResponse(
    (response) => response.url().endsWith('/likes') && response.request().method() === 'DELETE'
  );
  await like.press('Space');
  const deletion = await removed;
  expect(deletion.ok()).toBeTruthy();
  await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText(`${likeCount - 1} Me gusta`, { exact: true })).toBeVisible();
});
