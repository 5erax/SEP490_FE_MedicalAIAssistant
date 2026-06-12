import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");

test.describe("global navigation UX", () => {
  test("internal links navigate without reloading the document", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/");
    await page.evaluate(() => {
      window.__medimateSpaSentinel = "preserved";
    });

    await page.locator('a[href="/pricing"]').first().click();

    await expect(page).toHaveURL(/\/pricing$/);
    await expect.poll(() => page.evaluate(() => window.__medimateSpaSentinel)).toBe("preserved");
  });

  test("browser back and forward keep the React route in sync", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/");

    await page.locator('a[href="/pricing"]').first().click();
    await expect(page).toHaveURL(/\/pricing$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.locator(".pricing-hero h1")).toBeVisible();
  });

  test("provides page titles and keyboard skip navigation", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/login");

    await expect(page).toHaveTitle("Đăng nhập | MediMate AI");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Bỏ qua đến nội dung chính" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("free users get a keyboard-safe premium explanation", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/dashboard");

    const lockedFeature = page.getByRole("button", {
      name: /Triệu chứng, yêu cầu MediMate\+/,
    }).first();
    await lockedFeature.click();

    const dialog = page.getByRole("dialog", { name: "Cần nâng cấp MediMate+" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Để sau" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(lockedFeature).toBeFocused();
  });

  test("premium users can navigate directly to premium features", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        displayName: "Premium Patient",
        isPremium: true,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);

    await openRoute(page, "/dashboard");

    const symptomLink = page.getByRole("link", { name: /Triệu chứng/ }).first();
    await expect(symptomLink).toHaveAttribute("href", "/symptom");
    await symptomLink.click();
    await expect(page).toHaveURL(/\/symptom$/);
  });

  test("mobile workspace drawer opens and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await preparePage(page);
    await openRoute(page, "/dashboard");

    const menuButton = page.getByRole("button", { name: "Mở menu" });
    await menuButton.click();
    await expect(page.locator(".user-shell-sidebar")).toHaveClass(/mobile-open/);

    await page.keyboard.press("Escape");
    await expect(page.locator(".user-shell-sidebar")).not.toHaveClass(/mobile-open/);
    await expect(menuButton).toBeFocused();
  });

  test("workspace search carries the query into the facility map", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/dashboard");

    await page.getByRole("searchbox", { name: "Tìm cơ sở y tế" }).fill("Chợ Rẫy");
    await page.getByRole("searchbox", { name: "Tìm cơ sở y tế" }).press("Enter");

    await expect(page).toHaveURL(/\/map\?search=Ch%E1%BB%A3%20R%E1%BA%ABy$/);
    await expect(page.getByRole("searchbox", { name: "Tìm cơ sở y tế" })).toHaveValue("Chợ Rẫy");
  });
});
