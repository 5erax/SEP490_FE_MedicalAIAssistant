import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function preparePatient(page, overrides = {}) {
  await preparePage(page);
  await page.addInitScript(({ accessToken, authOverrides }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      displayName: "Nguyễn Minh",
      roles: ["Patient"],
      isProfileCompleted: true,
      ...authOverrides,
    }));
  }, { accessToken: PATIENT_TOKEN, authOverrides: overrides });
  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "55555555-5555-4555-8555-555555555555",
        displayName: "Nguyễn Minh",
        email: "patient@example.com",
        roles: ["Patient"],
      },
    }),
  }));
}

test("authenticated facility map stays inside the patient workspace", async ({ page }) => {
  await preparePatient(page);
  await page.route("**/api/medical-facilities/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));
  await page.route("**/api/facility-departments/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));

  await openRoute(page, "/map?search=tim%20mach");

  await expect(page.locator(".user-shell")).toBeVisible();
  await expect(page.locator('.user-shell-nav a[href="/map"]')).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".user-shell-title h1")).toHaveText("Bản đồ");
  await expect(page.getByRole("searchbox", { name: "Lọc danh sách cơ sở y tế" })).toHaveValue("tim mach");
  await expect(page.locator(".map-page-actions").getByRole("button", { name: "Trang chủ" })).toBeHidden();

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) => ["critical", "serious"].includes(impact)),
  ).toEqual([]);
});

test("public facility map remains available without the private workspace", async ({ page }) => {
  await preparePage(page);
  await page.route("**/api/medical-facilities/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));
  await page.route("**/api/facility-departments/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));

  await openRoute(page, "/map");

  await expect(page.locator(".user-shell")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Bản đồ cơ sở y tế" })).toBeVisible();
  await expect(page.locator(".map-page-actions").getByRole("button", { name: "Trang chủ" })).toBeVisible();
});

test("profile sections use one workspace navigation hierarchy", async ({ page }) => {
  await preparePatient(page);
  await page.route("**/api/patient-profiles**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { items: [], pageNumber: 1, pageSize: 100, totalPages: 0 },
    }),
  }));
  await page.route("**/api/user-subscriptions/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));

  await openRoute(page, "/profile");

  const sectionNavigation = page.getByRole("tablist", { name: "Các mục hồ sơ" });
  await expect(sectionNavigation).toBeVisible();
  await expect(page.locator(".profile-identity")).toBeHidden();
  await expect(page.locator(".profile-sidebar nav")).toHaveCSS("display", "flex");
  const navigationBox = await page.locator(".profile-sidebar").boundingBox();
  expect(navigationBox.width).toBeGreaterThan(600);
  expect(navigationBox.height).toBeLessThan(100);

  const personalTab = sectionNavigation.getByRole("tab", { name: "Thông tin cá nhân" });
  const medicalTab = sectionNavigation.getByRole("tab", { name: "Hồ sơ y tế" });
  await personalTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(medicalTab).toBeFocused();
  await expect(medicalTab).toHaveAttribute("aria-selected", "true");
});

test("premium patients do not see an upgrade promotion", async ({ page }) => {
  await preparePatient(page, { isPremium: true });

  await openRoute(page, "/dashboard");

  await expect(page.locator(".user-shell-plan")).toHaveCount(0);
  await expect(page.locator(".user-shell-brand img")).toHaveAttribute("src", "/logo.svg");
});

test("mobile workspace navigation fills the available width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await preparePatient(page);

  await openRoute(page, "/dashboard");

  const navigation = page.getByRole("navigation", { name: "Điều hướng nhanh" });
  const columns = await navigation.evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean)
  ));
  expect(columns).toHaveLength(2);

  const firstItemBox = await navigation.getByRole("link", { name: /Tư vấn chuyên khoa/ }).boundingBox();
  expect(firstItemBox.width).toBeGreaterThan(120);

  await page.emulateMedia({ forcedColors: "active" });
  await expect(navigation).toHaveCSS("border-top-style", "solid");
});
