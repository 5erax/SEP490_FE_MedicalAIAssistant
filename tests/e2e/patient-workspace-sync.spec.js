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

test("authenticated facility map fills the patient workspace content area", async ({ page }) => {
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

  await expect(page.locator(".user-shell-content")).toHaveClass(/is-full-bleed/);
  await expect(page.locator(".user-shell-main")).toHaveClass(/has-full-bleed-content/);
  await expect(page.locator(".clinic-page")).toHaveCSS("border-top-style", "none");
  await expect(page.locator(".clinic-page")).toHaveCSS("border-top-left-radius", "0px");
  await expect(page.locator(".map-stage")).toHaveCSS("padding-top", "0px");
  await expect(page.locator(".map-panel")).toHaveCSS("border-top-left-radius", "0px");
  await expect(page.locator(".map-panel")).toHaveCSS("margin-top", "0px");
  await expect(page.locator(".map-panel")).toHaveCSS("top", "0px");

  const [mainBox, topbarBox, mapBox] = await Promise.all([
    page.locator(".user-shell-main").boundingBox(),
    page.locator(".user-shell-topbar").boundingBox(),
    page.locator(".clinic-page").boundingBox(),
  ]);
  expect(Math.abs(mapBox.x - mainBox.x)).toBeLessThan(1);
  expect(Math.abs(mapBox.width - mainBox.width)).toBeLessThan(1);
  expect(Math.abs(mapBox.y - (topbarBox.y + topbarBox.height))).toBeLessThan(2);

  const [mapStageBox, mapPanelBox] = await Promise.all([
    page.locator(".map-stage").boundingBox(),
    page.locator(".map-panel").boundingBox(),
  ]);
  expect(Math.abs(mapPanelBox.x - mapStageBox.x)).toBeLessThan(1);
  expect(Math.abs(mapPanelBox.y - mapStageBox.y)).toBeLessThan(1);
  expect(Math.abs(mapPanelBox.width - mapStageBox.width)).toBeLessThan(1);

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) => ["critical", "serious"].includes(impact)),
  ).toEqual([]);

  await page.setViewportSize({ width: 375, height: 812 });
  const [mobileStageBox, mobilePanelBox, mobileLibraryMapBox] = await Promise.all([
    page.locator(".map-stage").boundingBox(),
    page.locator(".map-panel").boundingBox(),
    page.locator(".map-panel > .maplibregl-map").boundingBox(),
  ]);
  expect(Math.abs(mobilePanelBox.x - mobileStageBox.x)).toBeLessThan(1);
  expect(Math.abs(mobilePanelBox.y - mobileStageBox.y)).toBeLessThan(1);
  expect(Math.abs(mobileLibraryMapBox.x - mobilePanelBox.x)).toBeLessThan(1);
  expect(Math.abs(mobileLibraryMapBox.y - mobilePanelBox.y)).toBeLessThan(1);
  expect(Math.abs(mobileLibraryMapBox.width - mobilePanelBox.width)).toBeLessThan(1);
  await expect(page.locator(".map-panel > .maplibregl-map")).toHaveCSS("border-top-left-radius", "0px");
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

test("patient shell omits unsupported promotion and notification controls", async ({ page }) => {
  await preparePatient(page);

  await openRoute(page, "/dashboard");

  await expect(page.locator(".user-shell-plan")).toHaveCount(0);
  await expect(page.locator('button[aria-label="Thông báo"]')).toHaveCount(0);
  await expect(page.locator(".user-shell-brand img")).toHaveAttribute("src", "/logo.svg");
  await expect(page.locator(".title-icon")).toHaveCSS("background-color", "rgb(230, 244, 238)");
});

test("clinical history action stays below the sticky workspace header", async ({ page }) => {
  await preparePatient(page);

  await openRoute(page, "/symptom");

  const historyAction = page.locator(".assessment-history-action");
  await expect(historyAction).toBeVisible();
  await expect(historyAction).toHaveCSS("position", "static");
  await expect(historyAction).toHaveCSS("z-index", "auto");

  const [topbarBox, actionBox] = await Promise.all([
    page.locator(".user-shell-topbar").boundingBox(),
    historyAction.boundingBox(),
  ]);
  expect(actionBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height);
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
