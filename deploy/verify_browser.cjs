// Optional browser smoke test of the packaged production app, using installed Playwright.
const { createRequire } = require('node:module');
const path = require('node:path');
const frontendRequire = createRequire(path.join(__dirname, '..', 'frontend', 'package.json'));
const { chromium, expect } = frontendRequire('@playwright/test');

(async () => {
  const origin = process.env.PROTUBE_TEST_URL || 'http://127.0.0.1:18080';
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const firstPage = await (await page.request.get(`${origin}/api/videos`)).json();
    const pages = [firstPage];
    while (pages.at(-1).hasNext) {
      pages.push(await (await page.request.get(`${origin}/api/videos?page=${pages.length}`)).json());
    }
    const items = pages.flatMap((result) => result.items);
    const details = await Promise.all(items.map(async (item) =>
      (await page.request.get(`${origin}/api/videos/${item.id}`)).json()));
    const emptyIndex = details.findIndex((detail) => detail.comments.length === 0);
    const commentedIndex = details.findIndex((detail) => detail.comments.length > 0);
    expect(emptyIndex).toBeGreaterThanOrEqual(0);
    expect(commentedIndex).toBeGreaterThanOrEqual(0);
    const first = firstPage.items[0];
    async function loadCatalog() {
      await expect(page.getByRole('button', { name: first.title, exact: true }).first()).toBeVisible();
      let count = firstPage.items.length;
      await expect(page.locator('.video-catalog > li')).toHaveCount(count);
      for (const nextPage of pages.slice(1)) {
        await page.getByRole('button', { name: 'Cargar más', exact: true }).click();
        count += nextPage.items.length;
        await expect(page.locator('.video-catalog > li')).toHaveCount(count);
      }
      await expect(page.getByRole('button', { name: 'Cargar más', exact: true })).toHaveCount(0);
    }
    await page.goto(origin);
    await loadCatalog();
    await page.locator('.video-catalog > li').nth(emptyIndex).getByRole('button').click();
    await expect(page.getByRole('heading', { name: items[emptyIndex].title, exact: true })).toBeVisible();
    await expect(page.getByText('Este vídeo todavía no tiene comentarios.', { exact: true })).toBeVisible();
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return video && video.readyState >= 1 && video.duration > 0 && !video.error;
    }, undefined, { timeout: 30000 });
    await page.locator('video').evaluate(async (video) => {
      video.muted = true;
      await video.play();
    });
    await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0);
    await page.getByRole('button', { name: 'Volver al catálogo', exact: true }).click();
    await loadCatalog();
    const detail = details[commentedIndex];
    await page.locator('.video-catalog > li').nth(commentedIndex).getByRole('button').click();
    await expect(page.getByRole('heading', { name: `Comentarios (${detail.comments.length})`, exact: true })).toBeVisible();
    expect(detail.comments.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
    console.log('PASS: production browser catalog, load more, details, playback, comments and empty-comments case');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
