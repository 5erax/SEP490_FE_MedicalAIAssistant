import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
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
  await page.getByRole("button", { name: "Tạo cơ sở" }).click();
  const facilityDialog = page.getByRole("dialog");
  await facilityDialog.getByLabel("Tên cơ sở y tế").fill("Bệnh viện Đa khoa A");
  await facilityDialog.getByLabel("Địa chỉ").fill("123 Nguyễn Trãi");
  await facilityDialog.getByLabel("Vĩ độ").fill("10.8491");
  await facilityDialog.getByLabel("Kinh độ").fill("106.7715");
  await facilityDialog.getByLabel("Tim mạch").check();
  await facilityDialog.getByRole("button", { name: "Tạo cơ sở" }).click();

  await expect(page.getByText("Đã tạo cơ sở y tế.", { exact: true })).toBeVisible();
  expect(createdFacility).toEqual({
    facilityName: "Bệnh viện Đa khoa A",
    address: "123 Nguyễn Trãi",
    latitude: 10.8491,
    longitude: 106.7715,
    phone: null,
    website: null,
    imageUrl: null,
    openingHours: null,
    facilityType: null,
    isActive: true,
    departmentIds: [DEPARTMENT_ID],
  });
});

test("admin uploads a facility image to Cloudinary before saving", async ({ page }) => {
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

  const uploadedImageUrl = "https://res.cloudinary.com/demo/image/upload/v1/medical-facilities/facility.jpg";
  let createdFacility = null;
  let cloudinaryUploadRequested = false;

  await page.route(/^https:\/\/api\.cloudinary\.com\/v1_1\/[^/]+\/image\/upload$/, async (route) => {
    cloudinaryUploadRequested = true;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: uploadedImageUrl,
        public_id: "medical-facilities/facility",
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
  await page.getByRole("button", { name: "Tạo cơ sở" }).click();
  const facilityDialog = page.getByRole("dialog");
  await facilityDialog.getByLabel("Tên cơ sở y tế").fill("Bệnh viện Đa khoa A");
  await facilityDialog.getByLabel("Địa chỉ").fill("123 Nguyễn Trãi");
  await facilityDialog.getByLabel("Tim mạch").check();
  await facilityDialog.getByLabel("Ảnh cơ sở y tế").setInputFiles({
    name: "facility.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-image"),
  });

  await expect(page.getByText("Đã tải ảnh lên Cloudinary.", { exact: true })).toBeVisible();
  await expect(facilityDialog.getByLabel("Cloudinary image URL")).toHaveValue(uploadedImageUrl);
  await expect(facilityDialog.locator(".facility-image-preview")).toHaveAttribute("src", uploadedImageUrl);

  await facilityDialog.getByRole("button", { name: "Tạo cơ sở" }).click();

  expect(cloudinaryUploadRequested).toBe(true);
  expect(createdFacility).toMatchObject({
    facilityName: "Bệnh viện Đa khoa A",
    address: "123 Nguyễn Trãi",
    imageUrl: uploadedImageUrl,
    departmentIds: [DEPARTMENT_ID],
  });
});

test("admin updates, toggles, and deletes a medical facility", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let updatePayload = null;
  let statusPayload = null;
  let deleteRequested = false;
  let facilityRecord = {
    id: "11111111-1111-4111-8111-111111111111",
    facilityName: "Bệnh viện Đa khoa A",
    address: "123 Nguyễn Trãi",
    latitude: 10.8491,
    longitude: 106.7715,
    phone: "0281234567",
    website: "https://hospital.example",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/facility-a.jpg",
    openingHours: "07:00 - 17:00",
    facilityType: "Bệnh viện",
    isActive: true,
    departmentIds: [DEPARTMENT_ID],
  };

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

    if (pathname === "/api/facility-departments/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: facilityRecord ? [{
            id: "33333333-3333-4333-8333-333333333333",
            facilityId: facilityRecord.id,
            facilityName: facilityRecord.facilityName,
            departmentId: DEPARTMENT_ID,
            departmentName: "Tim mạch",
          }] : [],
        }),
      });
    }

    if (pathname === "/api/medical-facilities" && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: facilityRecord ? [facilityRecord] : [], pageNumber: 1, pageSize: 100, totalCount: facilityRecord ? 1 : 0, totalPages: 1 },
        }),
      });
    }

    if (pathname === `/api/medical-facilities/${facilityRecord?.id}` && method === "PUT") {
      updatePayload = route.request().postDataJSON();
      facilityRecord = { ...facilityRecord, ...updatePayload };
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã cập nhật cơ sở y tế.", data: facilityRecord }),
      });
    }

    if (pathname === `/api/medical-facilities/${facilityRecord?.id}/status` && method === "PATCH") {
      statusPayload = route.request().postDataJSON();
      facilityRecord = { ...facilityRecord, isActive: statusPayload.isActive };
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã cập nhật trạng thái.", data: facilityRecord }),
      });
    }

    if (pathname === `/api/medical-facilities/${facilityRecord?.id}` && method === "DELETE") {
      deleteRequested = true;
      facilityRecord = null;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã xóa cơ sở y tế." }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/facilities", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Đủ dữ liệu bản đồ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sửa" }).click();
  const facilityDialog = page.getByRole("dialog");
  await facilityDialog.getByLabel("Tên cơ sở y tế").fill("Bệnh viện Đa khoa A - Cơ sở 2");
  await facilityDialog.getByLabel("Kinh độ").fill("106.7725");
  await facilityDialog.getByRole("button", { name: "Lưu cập nhật" }).click();

  await expect(page.getByText("Đã cập nhật cơ sở y tế.", { exact: true })).toBeVisible();
  expect(updatePayload).toMatchObject({
    facilityName: "Bệnh viện Đa khoa A - Cơ sở 2",
    address: "123 Nguyễn Trãi",
    latitude: 10.8491,
    longitude: 106.7725,
    phone: "0281234567",
    website: "https://hospital.example",
    imageUrl: "https://res.cloudinary.com/demo/image/upload/facility-a.jpg",
    openingHours: "07:00 - 17:00",
    facilityType: "Bệnh viện",
    isActive: true,
    departmentIds: [DEPARTMENT_ID],
  });

  await page.getByRole("button", { name: "Tắt" }).click();
  await expect(page.getByText("Đang tắt", { exact: true })).toBeVisible();
  expect(statusPayload).toEqual({ isActive: false });

  await page.getByRole("button", { name: "Xóa" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa cơ sở" }).click();
  await expect(page.getByText("Chưa có cơ sở y tế", { exact: true })).toBeVisible();
  expect(deleteRequested).toBe(true);
});

test("admin retries a failed facility list and receives an empty state", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let facilityRequestCount = 0;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/medical-facilities") {
      facilityRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (facilityRequestCount <= 2) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Sensitive facility platform detail" }),
        });
      }

      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 100, totalCount: 0, totalPages: 1 },
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/facilities", { waitUntil: "domcontentloaded" });

  const errorState = page.getByRole("status").filter({ hasText: "Không thể tải danh sách cơ sở y tế" });
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Vui lòng kiểm tra kết nối và thử tải lại danh sách cơ sở y tế.");
  await expect(errorState).not.toContainText("Sensitive facility platform detail");

  const retryButton = errorState.getByRole("button", { name: "Thử tải lại" });
  await expect(retryButton).toHaveCSS("min-height", "44px");
  await retryButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Chưa có cơ sở y tế", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(facilityRequestCount).toBe(3);
});
