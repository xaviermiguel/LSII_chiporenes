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

// The current UI still expects string[]. Its backend now returns VideoPage.
// Browser checks deliberately stub that old contract until the UI task integrates it.
test('browser displays a list using the current UI contract (mock API)', async ({ page }) => {
  await page.route('**/api/videos', (route) => route.fulfill({ json: ['Browser fixture'] }));
  await page.goto('/');
  await expect(page.getByRole('listitem')).toHaveText(['Browser fixture']);
  await expect(page.getByRole('img', { name: 'logo' })).toBeVisible();
});

test('browser displays a controlled request failure (mock API)', async ({ page }) => {
  await page.route('**/api/videos', (route) => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Error', exact: true })).toBeVisible();
  await expect(page.getByText(/Error fetching videos:/)).toBeVisible();
});
