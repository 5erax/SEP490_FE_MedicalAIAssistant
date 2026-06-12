import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";

test("admin creates a medical facility linked to an existing department", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let createdFacility = null;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/medical-departments") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{ id: DEPARTMENT_ID, departmentName: "Tim mạch", description: "" }],
        }),
      });
    }

    if (pathname === "/api/medical-facilities" && method === "POST") {
      createdFacility = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã tạo cơ sở y tế.", data: { id: "facility-id" } }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Cơ sở y tế", exact: true }).click();
  await page.getByLabel("Tên cơ sở y tế").fill("Bệnh viện Đa khoa A");
  await page.getByLabel("Địa chỉ").fill("123 Nguyễn Trãi");
  await page.getByLabel("Tim mạch").check();
  await page.getByRole("button", { name: "Tạo cơ sở và liên kết chuyên khoa" }).click();

  await expect(page.getByText("Đã tạo cơ sở y tế.", { exact: true })).toBeVisible();
  expect(createdFacility).toEqual({
    facilityName: "Bệnh viện Đa khoa A",
    address: "123 Nguyễn Trãi",
    phone: null,
    website: null,
    openingHours: null,
    facilityType: null,
    isActive: true,
    departmentIds: [DEPARTMENT_ID],
  });
});
