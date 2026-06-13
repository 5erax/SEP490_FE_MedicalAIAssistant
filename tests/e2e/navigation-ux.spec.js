import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");
const ADMIN_ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");
const STAFF_ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJTdGFmZiIsImVtYWlsIjoic3RhZmZAZXhhbXBsZS5jb20ifQ",
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
    await expect(page.locator("#root")).toHaveJSProperty("inert", true);

    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("button", { name: "Xem bảng giá" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Để sau" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("#root")).toHaveJSProperty("inert", false);
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
    const drawer = page.getByRole("dialog", { name: "Điều hướng không gian cá nhân" });
    await expect(drawer).toHaveClass(/mobile-open/);
    await expect(drawer.getByRole("button", { name: "Đóng menu" })).toBeFocused();
    await expect(page.locator(".user-shell-main")).toHaveJSProperty("inert", true);
    await expect(page.locator(".user-shell-mobile-nav")).toHaveJSProperty("inert", true);

    const upgradeButton = drawer.getByRole("button", { name: "Nâng cấp" });
    await upgradeButton.focus();
    await page.keyboard.press("Tab");
    await expect(drawer.getByRole("link", { name: "MediMate" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.locator(".user-shell-main")).toHaveJSProperty("inert", false);
    await expect(page.locator(".user-shell-mobile-nav")).toHaveJSProperty("inert", false);
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

  test("signup preserves return intent through first-login profile setup", async ({ page }) => {
    await preparePage(page);
    await page.route("**/api/authentication/register", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: ACCESS_TOKEN,
          roles: ["Patient"],
          isFirstLogin: true,
          email: "new.patient@example.com",
        },
      }),
    }));

    await openRoute(page, "/signup?returnTo=%2Fsymptom");
    await page.getByLabel("Email").fill("new.patient@example.com");
    await page.getByLabel("Tên đăng nhập").fill("new-patient");
    await page.getByLabel("Tên hiển thị").fill("New Patient");
    await page.getByLabel("Mật khẩu", { exact: true }).fill("Example123!");
    await page.getByLabel("Nhập lại mật khẩu").fill("Example123!");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();

    await expect(page).toHaveURL(/\/patient\/profile\/setup\?returnTo=%2Fsymptom$/);
  });

  test("rejects external return intent after login", async ({ page }) => {
    await preparePage(page);
    await page.route("**/api/authentication/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: ACCESS_TOKEN,
          roles: ["Patient"],
          isFirstLogin: false,
          email: "patient@example.com",
        },
      }),
    }));

    await openRoute(page, "/login?returnTo=https%3A%2F%2Fevil.example");
    await page.getByLabel("Email").fill("patient@example.com");
    await page.getByLabel("Mật khẩu").fill("Example123!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("admin sections support deep links and browser history", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        email: "admin@example.com",
        roles: ["Admin"],
      }));
    }, ADMIN_ACCESS_TOKEN);
    await page.route("**/api/**", (route) => route.abort());

    await openRoute(page, "/admin/users");
    await expect(page).toHaveURL(/\/app\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Tài khoản chờ duyệt" })).toBeVisible();

    await page.getByRole("button", { name: "Bác sĩ", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/admin\/doctors$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Tài khoản chờ duyệt" })).toBeVisible();
  });

  test("admin dialogs restore focus to their trigger", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        displayName: "Admin User",
        roles: ["Admin"],
      }));
    }, ADMIN_ACCESS_TOKEN);

    await openRoute(page, "/app/admin/subscriptions");
    const createButton = page.getByRole("button", { name: "Tạo gói", exact: true });
    await createButton.click();

    const dialog = page.getByRole("dialog", { name: "Tạo gói dịch vụ" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Đóng form" })).toBeFocused();
    await expect(page.locator("#root")).toHaveJSProperty("inert", true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page.locator("#root")).toHaveJSProperty("inert", false);
    await expect(createButton).toBeFocused();
  });

  test("first-login patient enters profile setup before protected routes", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
        isFirstLogin: true,
      }));
    }, ACCESS_TOKEN);

    await openRoute(page, "/symptom");
    await expect(page).toHaveURL(/\/patient\/profile\/setup\?returnTo=%2Fsymptom$/);
    await expect(page.getByRole("heading", { name: "Hoàn thiện hồ sơ sức khỏe" })).toBeVisible();
  });

  test("permission matrix routes each role to an allowed workspace", async ({ page }) => {
    await preparePage(page);
    await page.goto("/");
    await page.evaluate((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
    await openRoute(page, "/app/admin");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.evaluate(() => localStorage.clear());
    await page.evaluate((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Staff"],
      }));
    }, STAFF_ACCESS_TOKEN);
    await page.goto("/app/admin");
    await expect(page).toHaveURL(/\/app\/staff$/);

    await page.evaluate(() => localStorage.clear());
    await page.goto("/app/admin");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp%2Fadmin$/);
  });
});
