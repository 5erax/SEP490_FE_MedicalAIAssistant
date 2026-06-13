import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const FACILITY_DEPARTMENT_ID = "33333333-3333-4333-8333-333333333333";

test("admin creates a doctor with a selected FacilityDepartment UUID", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let createdDoctor = null;

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

    if (pathname === "/api/facility-departments/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{
            id: FACILITY_DEPARTMENT_ID,
            facilityId: "11111111-1111-4111-8111-111111111111",
            facilityName: "Bệnh viện A",
            departmentId: "22222222-2222-4222-8222-222222222222",
            departmentName: "Khoa Tim mạch",
          }],
        }),
      });
    }

    if (pathname === "/api/doctors" && method === "POST") {
      createdDoctor = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Doctor created successfully.",
          data: {
            id: "44444444-4444-4444-8444-444444444444",
            ...createdDoctor,
            facilityName: "Bệnh viện A",
            departmentName: "Khoa Tim mạch",
          },
        }),
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
  await page.getByRole("button", { name: "Bác sĩ", exact: true }).click();
  await page.locator(".doctor-filter-card")
    .getByRole("button", { name: "Thêm bác sĩ", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Thêm bác sĩ mới" });
  await dialog.getByLabel("Cơ sở y tế - khoa").selectOption(FACILITY_DEPARTMENT_ID);
  await dialog.getByLabel("Họ và tên bác sĩ").fill("BS. Nguyễn Minh Anh");
  await dialog.getByLabel("Học hàm/học vị").fill("ThS.BS");
  await dialog.getByLabel("Số năm kinh nghiệm").fill("8");
  await dialog.getByLabel("Vai trò trong khoa").selectOption("0");
  await dialog.getByRole("button", { name: "Thêm bác sĩ", exact: true }).click();

  await expect(page.getByText("Doctor created successfully.", { exact: true })).toBeVisible();
  expect(createdDoctor).toEqual({
    facilityDepartmentId: FACILITY_DEPARTMENT_ID,
    fullName: "BS. Nguyễn Minh Anh",
    academicTitle: "ThS.BS",
    departmentRole: 0,
    yearsOfExperience: 8,
    isActive: true,
  });
});

test("admin retries a failed doctor list and receives an empty state", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let doctorRequestCount = 0;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/doctors") {
      doctorRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (doctorRequestCount <= 2) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Sensitive upstream detail" }),
        });
      }

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/doctors", { waitUntil: "domcontentloaded" });

  const loadingState = page.getByText("Đang tải danh sách bác sĩ...", { exact: true });
  await expect(loadingState).toBeVisible();

  const errorState = page.getByRole("status").filter({ hasText: "Không thể tải danh sách bác sĩ" });
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Vui lòng kiểm tra kết nối và thử tải lại danh sách.");
  await expect(errorState).not.toContainText("Sensitive upstream detail");

  const retryButton = errorState.getByRole("button", { name: "Thử tải lại" });
  await retryButton.focus();
  await page.keyboard.press("Enter");

  await expect(loadingState).toBeVisible();
  await expect(page.getByText("Chưa có bác sĩ phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Trang 1 / 1 · 0 bác sĩ", { exact: true })).toBeVisible();
  expect(doctorRequestCount).toBe(3);
});
