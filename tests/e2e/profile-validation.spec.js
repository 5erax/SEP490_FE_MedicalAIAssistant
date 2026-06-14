import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

test("patient profile setup validates contact and health values before saving", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      firstLogin: true,
      isProfileCompleted: false,
    }));
  }, ACCESS_TOKEN);

  let updateRequests = 0;
  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "55555555-5555-4555-8555-555555555555",
        displayName: "Nguyễn Minh",
        address: "",
        gender: 1,
        dateOfBirth: null,
        isFirstLogin: true,
        isProfileCompleted: false,
      },
    }),
  }));
  await page.route("**/api/patient-profiles**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: { items: [], pageNumber: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
    }),
  }));
  await page.route("**/api/users/*", (route) => {
    if (new URL(route.request().url()).pathname === "/api/users/me") {
      return route.fallback();
    }
    updateRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  await page.goto("/patient/profile/setup", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Ngày sinh").fill("2099-01-01");
  await page.getByLabel("Số điện thoại").fill("12abc");
  await page.getByLabel("Địa chỉ").fill("A");
  await page.getByLabel("Chiều cao (cm)").fill("300");
  await page.getByRole("button", { name: "Hoàn tất hồ sơ" }).click();

  await expect(page.getByText("Ngày sinh phải từ năm 1900 đến hôm nay.")).toBeVisible();
  await expect(page.getByText("Số điện thoại phải có 9-15 chữ số và có thể bắt đầu bằng +.")).toBeVisible();
  await expect(page.getByText("Địa chỉ phải có từ 5 đến 255 ký tự.")).toBeVisible();
  await expect(page.getByText("Chiều cao (cm) phải từ 40 đến 250.")).toBeVisible();
  expect(updateRequests).toBe(0);
});
