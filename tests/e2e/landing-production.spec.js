import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const PREMIUM_PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50In0",
  "",
].join(".");

async function setPremiumPatientAuth(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      hasPremiumAccess: true,
      roles: ["Patient"],
    }));
  }, PREMIUM_PATIENT_TOKEN);
}

test("landing uses a truthful map preview without loading MapLibre", async ({ page }) => {
  await preparePage(page);
  await page.goto("/", { waitUntil: "load" });

  await expect(page.getByRole("heading", {
    name: "Mở bản đồ khi bạn cần tìm cơ sở phù hợp.",
  })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở bản đồ cơ sở y tế" })).toHaveAttribute("href", "/map");

  for (const fakeContent of [
    "Bệnh viện Chợ Rẫy",
    "BV Đại học Y Dược TP.HCM",
    "Thời gian chờ dự kiến",
    "35 phút",
    "2.4 km",
  ]) {
    await expect(page.getByText(fakeContent, { exact: false })).toHaveCount(0);
  }

  await expect(page.locator(".maplibregl-canvas")).toHaveCount(0);
  const loadedResources = await page.evaluate(() => (
    performance.getEntriesByType("resource").map((entry) => entry.name)
  ));
  expect(loadedResources.some((resource) => resource.includes("maplibre"))).toBe(false);
});

test("landing map CTA navigates to the production map route", async ({ page }) => {
  await preparePage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.getByRole("link", { name: "Mở bản đồ cơ sở y tế" }).click();

  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByRole("heading", { name: "Bản đồ cơ sở y tế" })).toBeVisible();
});

test("production-sensitive demo surfaces show safety labels", async ({ page }) => {
  await preparePage(page);
  await page.route("**/api/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#demo")).toContainText("Demo chỉ hỗ trợ định hướng thông tin ban đầu");
  await expect(page.locator("#demo")).toContainText("cấp cứu 115");

  await setPremiumPatientAuth(page);
  await page.goto("/records", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Nội dung bên dưới chỉ là dữ liệu demo", { exact: false })).toBeVisible();

  await page.goto("/medication", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Kết quả trên màn hình này chỉ là dữ liệu demo", { exact: false })).toBeVisible();
});
