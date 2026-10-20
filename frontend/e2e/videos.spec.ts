import { test, expect } from '@playwright/test';

test('loads the video catalogue from the real backend', async ({ page, request }) => {
  const response = await request.get('http://127.0.0.1:8080/api/videos');
  expect(response.ok()).toBeTruthy();
  const videos: string[] = await response.json();
  expect(videos.length).toBeGreaterThan(0);
  await page.goto('/');
  await expect(page.getByText('Videos availables:')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveText(videos);
});
