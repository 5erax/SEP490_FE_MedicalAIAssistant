import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { Buffer } from "node:buffer";
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
    window.__MEDIMATE_CLOUDINARY_CONFIG__ = {
      cloudName: "demo",
      uploadPreset: "unsigned-test",
      folder: "medical-facilities",
    };
  }, ADMIN_TOKEN);

  const uploadedImageUrl = "https://res.cloudinary.com/demo/image/upload/v1/medical-facilities/doctor.jpg";
  let createdDoctor = null;
  let cloudinaryUploadRequested = false;

  await page.route(/^https:\/\/api\.cloudinary\.com\/v1_1\/[^/]+\/image\/upload$/, async (route) => {
    cloudinaryUploadRequested = true;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: uploadedImageUrl,
        public_id: "medical-facilities/doctor",
      }),
    });
  });

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
  await dialog.getByLabel("Số năm kinh nghiệm").fill("-1");
  await dialog.getByRole("button", { name: "Thêm bác sĩ", exact: true }).click();
  const errorSummary = dialog.getByRole("alert").filter({
    hasText: "Kiểm tra lại thông tin bác sĩ",
  });
  await expect(errorSummary).toBeFocused();
  await expect(errorSummary).toContainText("Số năm kinh nghiệm phải là số nguyên không âm.");
  await dialog.getByLabel("Số năm kinh nghiệm").fill("8");
  await dialog.getByLabel("Vai trò trong khoa").selectOption("0");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "doctor.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-image"),
  });

  await expect(page.getByText("Đã tải ảnh bác sĩ.", { exact: true })).toBeVisible();
  await expect(dialog.getByLabel("Đường dẫn ảnh bác sĩ")).toHaveValue(uploadedImageUrl);
  await expect(dialog.locator(".doctor-image-preview")).toHaveAttribute("src", uploadedImageUrl);
  await dialog.getByRole("button", { name: "Thêm bác sĩ", exact: true }).click();

  await expect(page.getByText("Doctor created successfully.", { exact: true })).toBeVisible();
  expect(cloudinaryUploadRequested).toBe(true);
  expect(createdDoctor).toEqual({
    facilityDepartmentId: FACILITY_DEPARTMENT_ID,
    fullName: "BS. Nguyễn Minh Anh",
    specialty: null,
    academicTitle: "ThS.BS",
    imageUrl: uploadedImageUrl,
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

  const errorState = page.getByRole("status").filter({ hasText: "Không thể tải danh sách bác sĩ" });
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Vui lòng kiểm tra kết nối và thử tải lại danh sách.");
  await expect(errorState).not.toContainText("Sensitive upstream detail");

  const retryButton = errorState.getByRole("button", { name: "Thử tải lại" });
  await retryButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Chưa có bác sĩ phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Trang 1 / 1 · 0 bác sĩ", { exact: true })).toBeVisible();
  expect(doctorRequestCount).toBe(3);
});

test("doctor management keeps filters in the URL and adapts long records", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let doctorRequest = null;

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
      doctorRequest = Object.fromEntries(url.searchParams);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [{
              id: "44444444-4444-4444-8444-444444444444",
              fullName: "PGS.TS.BS Nguyễn Hoàng Minh Anh Với Tên Rất Dài",
              academicTitle: "Phó giáo sư, Tiến sĩ, Bác sĩ chuyên khoa II",
              departmentName: "Khoa Tim mạch can thiệp và Điều trị chuyên sâu",
              departmentRoleName: "Trưởng khoa",
              facilityName: "Bệnh viện Đa khoa Khu vực Thành phố Thủ Đức Cơ sở Trung tâm",
              yearsOfExperience: 22,
              isActive: true,
            }],
            pageNumber: 2,
            pageSize: 20,
            totalCount: 21,
            totalPages: 2,
          },
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

  await page.goto(
    "/app/admin/doctors?search=Minh%20Anh&isActive=true&page=2&pageSize=20",
    { waitUntil: "domcontentloaded" },
  );

  await expect(page.getByLabel("Tìm bác sĩ")).toHaveValue("Minh Anh");
  await expect(page.getByLabel("Trạng thái")).toHaveValue("true");
  await expect(page.getByLabel("Hiển thị")).toHaveValue("20");
  await expect(page.getByText("Trang 2 / 2 · 21 bác sĩ", { exact: true })).toBeVisible();
  expect(doctorRequest).toMatchObject({
    search: "Minh Anh",
    isActive: "true",
    PageNumber: "2",
    PageSize: "20",
  });

  await page.getByLabel("Tìm bác sĩ").fill("Bác sĩ mới");
  await page.getByRole("button", { name: "Áp dụng" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("Bác sĩ mới");
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe("Minh Anh");
  await expect(page.getByLabel("Tìm bác sĩ")).toHaveValue("Minh Anh");

  const tableWrap = page.locator(".doctor-table-wrap");
  await expect(tableWrap).toBeVisible();
  const desktopOverflow = await tableWrap.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(desktopOverflow.scrollWidth).toBeLessThanOrEqual(desktopOverflow.clientWidth + 1);

  const cardList = page.locator(".doctor-card-list");
  for (const viewport of [
    { width: 390, height: 844, card: true },
    { width: 640, height: 900, card: true },
    { width: 768, height: 1024, card: true },
    { width: 1024, height: 900, card: true },
    { width: 1280, height: 900, card: false },
    { width: 1440, height: 1000, card: false },
  ]) {
    await page.setViewportSize(viewport);
    if (viewport.card) {
      await expect(tableWrap).toBeHidden();
      await expect(cardList).toBeVisible();
    } else {
      await expect(tableWrap).toBeVisible();
      await expect(cardList).toBeHidden();
    }

    const pageOverflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(pageOverflow.documentWidth).toBeLessThanOrEqual(pageOverflow.viewport);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(cardList.getByText("Khoa công tác", { exact: true })).toBeVisible();
  await expect(cardList.getByText("Bệnh viện", { exact: true })).toBeVisible();
  const statusButton = cardList.getByRole("button", {
    name: /Tạm ẩn PGS\.TS\.BS Nguyễn Hoàng Minh Anh/,
  });
  await expect(statusButton).toBeVisible();
  expect((await statusButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);

  const adminNavigation = page.getByRole("navigation", { name: "Điều hướng admin" });
  const activeNavigationItem = adminNavigation.getByRole("button", { name: "Bác sĩ" });
  const navigationBox = await adminNavigation.boundingBox();
  const activeNavigationBox = await activeNavigationItem.boundingBox();
  expect(activeNavigationBox.x).toBeGreaterThanOrEqual(navigationBox.x);
  expect(activeNavigationBox.x + activeNavigationBox.width).toBeLessThanOrEqual(
    navigationBox.x + navigationBox.width,
  );

  const accessibility = await new AxeBuilder({ page })
    .include(".doctor-clinical-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);
  expect(seriousViolations).toEqual([]);
});
