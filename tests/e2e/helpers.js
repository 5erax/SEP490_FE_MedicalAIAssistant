import { expect } from "@playwright/test";

export async function preparePage(page) {
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.abort());

  await page.addInitScript(() => {
    const marker = "__medimate_e2e_prepared__";
    if (window.name !== marker) {
      localStorage.clear();
      sessionStorage.clear();
      window.name = marker;
    }
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
}

export async function openRoute(page, path) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("main").first()).toBeVisible();
  await expect(page.locator("h1:visible, h2:visible").first()).toBeVisible();
}

export function pathname(page) {
  return new URL(page.url()).pathname;
}
