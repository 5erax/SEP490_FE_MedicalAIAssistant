import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";

async function authenticate(page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, TOKEN);
}

test("symptom analysis renders the backend response", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let analyzePayload = null;

  await page.route("**/api/symptom-analysis/analyze", async (route) => {
    analyzePayload = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          sessionId: "33333333-3333-4333-8333-333333333333",
          recommendedDepartments: [{
            departmentId: DEPARTMENT_ID,
            departmentName: "Tim mạch",
            confidenceScore: 0.91,
            reason: "Phù hợp với triệu chứng mô tả.",
            priorityRank: 1,
            isEmergencySuggested: false,
          }],
          recommendedFacilities: [],
        },
      }),
    });
  });

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  await page.locator("textarea").first().fill("Đau ngực nhẹ");
  await page.getByRole("button", { name: "Phân tích →" }).click();

  await expect(page.getByText("Tim mạch", { exact: true })).toBeVisible();
  await expect(page.getByText("91%", { exact: true })).toBeVisible();
  expect(analyzePayload).toEqual({
    message: "Đau ngực nhẹ Mức độ người dùng tự đánh giá: medium.",
    disclaimerShown: true,
  });
});

test("facility review submits the Swagger payload", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let reviewPayload = null;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === "/api/medical-facilities/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{
            id: FACILITY_ID,
            facilityName: "Bệnh viện A",
            address: "123 Nguyễn Trãi",
            latitude: 10.77,
            longitude: 106.69,
            phone: "0123456789",
            facilityType: "Hospital",
            openingHours: "24/7",
            departments: [],
          }],
        }),
      });
    }

    if (url.pathname === `/api/feedback-reviews/facility/${FACILITY_ID}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
        }),
      });
    }

    if (url.pathname === "/api/feedback-reviews" && method === "POST") {
      reviewPayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã gửi đánh giá.", data: { id: "review-id" } }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Bệnh viện A", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Số sao").selectOption("4");
  await page.getByLabel("Nhận xét").fill("Dịch vụ tốt");
  await page.getByRole("button", { name: "Gửi đánh giá" }).click();

  await expect(page.getByText("Đã gửi đánh giá.", { exact: true })).toBeVisible();
  expect(reviewPayload).toEqual({
    facilityId: FACILITY_ID,
    rating: 4,
    comment: "Dịch vụ tốt",
  });
});

test("admin creates a doctor invitation with an optional doctor link", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let invitationPayload = null;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (url.pathname === "/api/admin/doctor-invitations" && method === "POST") {
      invitationPayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Invitation sent.",
          data: {
            id: "44444444-4444-4444-8444-444444444444",
            email: "doctor@example.com",
            doctorId: null,
            status: "Pending",
          },
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(url.pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Bác sĩ", exact: true }).click();
  await page.getByLabel("Email bác sĩ").fill("doctor@example.com");
  await page.getByRole("button", { name: "Gửi invitation" }).click();

  await expect(page.getByText("Invitation sent.", { exact: true })).toBeVisible();
  expect(invitationPayload).toEqual({ email: "doctor@example.com" });
});

test("admin invitation displays backend error details with the generic summary", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (url.pathname === "/api/admin/doctor-invitations") {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Create doctor invitation failed.",
          errors: ["The email already has an account."],
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(url.pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Bác sĩ", exact: true }).click();
  await page.getByLabel("Email bác sĩ").fill("new-doctor@example.com");
  await page.getByRole("button", { name: "Gửi invitation" }).click();

  await expect(page.getByText(
    "Create doctor invitation failed. The email already has an account.",
    { exact: true },
  )).toBeVisible();
});

test("profile page renders and updates backend user data instead of mock data", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let updatePayload = null;
  const USER_ID = "55555555-5555-4555-8555-555555555555";

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            identityId: USER_ID,
            displayName: "Nguyễn Minh Backend",
            email: "backend@example.com",
            phoneNumber: "0901234567",
            address: "Hà Nội",
            gender: 1,
            dateOfBirth: "1990-01-02",
          },
        }),
      });
    }

    if (url.pathname === `/api/users/${USER_ID}` && method === "PUT") {
      updatePayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Profile updated.", data: updatePayload }),
      });
    }

    if (url.pathname === "/api/patient-profiles") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
        }),
      });
    }

    if (url.pathname === "/api/user-subscriptions/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Nguyễn Minh Backend", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Chỉnh sửa" }).click();
  await page.getByLabel("Họ và tên").fill("Nguyễn Minh Đã Sửa");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();

  await expect(page.getByText("Đã lưu thông tin!", { exact: true })).toBeVisible();
  expect(updatePayload).toEqual({
    displayName: "Nguyễn Minh Đã Sửa",
    address: "Hà Nội",
    gender: 1,
    dateOfBirth: "1990-01-02",
    phoneNumber: "0901234567",
  });
});
