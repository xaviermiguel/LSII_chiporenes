import { test, expect } from '@playwright/test';

const api = 'http://127.0.0.1:18080';

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
  expect(detail).toMatchObject({ id: 101, title: 'E2E first video', comments: [{ text: 'E2E comment' }] });
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
  await expect(page.getByRole('listitem')).toHaveText(['E2E first video', 'E2E second video', 'E2E unavailable file']);
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
  await expect(page.getByRole('listitem')).toHaveText(['E2E first video', 'E2E second video']);
  await page.getByRole('button', { name: 'Cargar más' }).click();
  await expect(page.getByRole('listitem')).toHaveText(['E2E first video', 'E2E second video', 'E2E unavailable file']);
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
