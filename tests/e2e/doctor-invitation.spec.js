import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const DOCTOR_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJEb2N0b3IifQ",
  "",
].join(".");

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50In0",
  "",
].join(".");

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

async function mockLinkedInvitation(page, token = "linked-token", overrides = {}) {
  await page.route(`**/api/doctor-invitations/validate?token=${token}`, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        isValid: true,
        email: "linked.doctor@example.com",
        doctorId: "11111111-1111-1111-1111-111111111111",
        isLinkedToExistingDoctorProfile: true,
        doctorName: "BS. Nguyễn Văn A",
        suggestedFullName: "Nguyễn Văn A",
        ...overrides,
      },
    }),
  }));
}

test("linked doctor profile submits only account fields", async ({ page }) => {
  let registerBody = null;

  await mockLinkedInvitation(page);

  await page.route("**/api/doctor-invitations/register", async (route) => {
    registerBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          userId: "22222222-2222-2222-2222-222222222222",
          doctorId: "11111111-1111-1111-1111-111111111111",
          email: "linked.doctor@example.com",
          fullName: "Nguyễn Văn A",
          role: "Doctor",
        },
      }),
    });
  });

  await page.goto("/register-doctor?token=linked-token", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("BS. Nguyễn Văn A", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("linked.doctor@example.com");
  await expect.poll(() => page.evaluate(() => JSON.stringify(localStorage))).not.toContain("linked-token");

  await page.getByLabel(/^Mật khẩu/).fill("Password123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123!");
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();

  await expect(page.getByText("Tài khoản bác sĩ đã sẵn sàng.", { exact: true })).toBeVisible();
  expect(registerBody).toEqual({
    token: "linked-token",
    fullName: "Nguyễn Văn A",
    password: "Password123!",
    phoneNumber: "0900000000",
  });
  await page.getByRole("button", { name: "Đăng nhập ngay" }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
  await expect(page.getByLabel("Email")).toHaveValue("linked.doctor@example.com");
  await expect.poll(() => page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "linked.doctor@example.com",
  );
});

test("invited doctor can register, log in, and open the doctor workspace", async ({ page }) => {
  await mockLinkedInvitation(page, "doctor-login-token");

  await page.route("**/api/doctor-invitations/register", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        userId: "22222222-2222-2222-2222-222222222222",
        doctorId: "11111111-1111-1111-1111-111111111111",
        email: "linked.doctor@example.com",
        fullName: "Nguyễn Văn A",
        role: "Doctor",
      },
    }),
  }));

  await page.route("**/api/authentication/login", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        accessToken: DOCTOR_TOKEN,
        userId: "22222222-2222-2222-2222-222222222222",
        roles: ["Doctor"],
        firstLogin: true,
        isProfileCompleted: false,
      },
    }),
  }));

  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "22222222-2222-2222-2222-222222222222",
        displayName: "Nguyễn Văn A",
        roles: ["Doctor"],
      },
    }),
  }));

  await page.route("**/api/medical-departments", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));

  await page.goto("/register-doctor?token=doctor-login-token", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Mật khẩu/).fill("Password123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123!");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await page.getByRole("button", { name: "Đăng nhập ngay" }).click();

  await expect(page.getByLabel("Email")).toHaveValue("linked.doctor@example.com");
  await page.getByLabel("Mật khẩu").fill("Password123!");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Chẩn đoán lâm sàng" })).toBeVisible();
  await expect(page.evaluate(() => window.history.state)).resolves.toBeNull();
});

test("invitation login rejects an account without a doctor role", async ({ page }) => {
  await mockLinkedInvitation(page, "missing-role-token");

  await page.route("**/api/doctor-invitations/register", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        email: "linked.doctor@example.com",
        role: "Doctor",
      },
    }),
  }));

  await page.route("**/api/authentication/login", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        accessToken: PATIENT_TOKEN,
        roles: ["Patient"],
        firstLogin: false,
        isProfileCompleted: true,
      },
    }),
  }));

  await page.goto("/register-doctor?token=missing-role-token", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Mật khẩu/).fill("Password123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123!");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();
  await page.getByRole("button", { name: "Đăng nhập ngay" }).click();
  await page.getByLabel("Mật khẩu").fill("Password123!");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
  await expect(page.getByRole("alert")).toContainText("chưa được cấp quyền Bác sĩ");
  await expect(page.evaluate(() => localStorage.getItem("medimate.auth"))).resolves.toBeNull();
  await expect(page.evaluate(() => window.history.state)).resolves.toBeNull();
});

test("invitation login keeps an inactive doctor on the login page", async ({ page }) => {
  await page.route("**/api/authentication/login", (route) => route.fulfill({
    status: 403,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      message: "Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa.",
    }),
  }));

  await page.goto("/login?returnTo=%2Fdashboard", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.history.replaceState({
      doctorInvitation: {
        email: "inactive.doctor@example.com",
        expectedRole: "doctor",
      },
    }, "", window.location.href);
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("Email")).toHaveValue("inactive.doctor@example.com");
  await page.getByLabel("Mật khẩu").fill("Password123!");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
  await expect(page.getByRole("alert")).toContainText("chưa được kích hoạt");
  await expect(page.evaluate(() => localStorage.getItem("medimate.auth"))).resolves.toBeNull();
});

test("invitation login keeps the doctor email after an incorrect password", async ({ page }) => {
  await page.route("**/api/authentication/login", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      message: "Email hoặc mật khẩu không chính xác.",
    }),
  }));

  await page.goto("/login?returnTo=%2Fdashboard", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.history.replaceState({
      doctorInvitation: {
        email: "doctor@example.com",
        expectedRole: "doctor",
      },
    }, "", window.location.href);
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.getByLabel("Mật khẩu").fill("WrongPassword123!");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page.getByRole("alert")).toContainText("không chính xác");
  await expect(page.getByLabel("Email")).toHaveValue("doctor@example.com");
  await expect(page.evaluate(() => localStorage.getItem("medimate.auth"))).resolves.toBeNull();
});

test("new doctor submits facility department and professional fields", async ({ page }) => {
  let registerBody = null;

  await page.route("**/api/doctor-invitations/validate?token=new-doctor-token", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        isValid: true,
        email: "new.doctor@example.com",
        doctorId: null,
        isLinkedToExistingDoctorProfile: false,
        doctorName: null,
        suggestedFullName: "Doctor Test",
      },
    }),
  }));

  await page.route("**/api/facility-departments/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [{
        id: "33333333-3333-3333-3333-333333333333",
        facilityName: "Bệnh viện A",
        departmentName: "Khoa Tim mạch",
      }],
    }),
  }));

  await page.route("**/api/doctor-invitations/register", async (route) => {
    registerBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          userId: "44444444-4444-4444-4444-444444444444",
          doctorId: "55555555-5555-5555-5555-555555555555",
          email: "new.doctor@example.com",
          fullName: "Doctor Test",
          role: "Doctor",
        },
      }),
    });
  });

  await page.goto("/register-doctor?token=new-doctor-token", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email")).toHaveValue("new.doctor@example.com");

  await page.getByLabel(/^Mật khẩu/).fill("Password123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123!");
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByLabel("Cơ sở y tế - khoa").selectOption("33333333-3333-3333-3333-333333333333");
  await page.getByLabel("Vai trò trong khoa").selectOption("2");
  await page.getByLabel("Chuyên môn / bằng cấp").fill("General Doctor");
  await page.getByLabel("Số năm kinh nghiệm").fill("3");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();

  await expect(page.getByText("Tài khoản bác sĩ đã sẵn sàng.", { exact: true })).toBeVisible();
  expect(registerBody).toEqual({
    token: "new-doctor-token",
    fullName: "Doctor Test",
    password: "Password123!",
    phoneNumber: "0900000000",
    facilityDepartmentId: "33333333-3333-3333-3333-333333333333",
    departmentRole: 2,
    qualification: "General Doctor",
    yearsOfExperience: 3,
  });
});

test("missing token shows an invalid invitation without calling validation", async ({ page }) => {
  let validationCalls = 0;
  await page.route("**/api/doctor-invitations/validate**", (route) => {
    validationCalls += 1;
    return route.abort();
  });

  await page.goto("/register-doctor", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Không thể tiếp tục đăng ký." })).toBeFocused();
  await expect(page.getByText("Link đăng ký thiếu invitation token.")).toBeVisible();
  expect(validationCalls).toBe(0);
});

for (const invitationCase of [
  { token: "invalid-token", message: "Invitation link is invalid." },
  { token: "expired-token", message: "Invitation link has expired." },
  { token: "used-token", message: "Invitation link has already been used." },
]) {
  test(`${invitationCase.token} is rejected before rendering the form`, async ({ page }) => {
    await page.route(`**/api/doctor-invitations/validate?token=${invitationCase.token}`, (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          isValid: false,
          message: invitationCase.message,
        },
      }),
    }));

    await page.goto(`/register-doctor?token=${invitationCase.token}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(invitationCase.message, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hoàn tất đăng ký" })).toHaveCount(0);
  });
}

test("validation errors are associated with fields and move focus to the summary", async ({ page }) => {
  let registerCalls = 0;
  await mockLinkedInvitation(page, "validation-token", {
    doctorName: null,
    suggestedFullName: "",
  });
  await page.route("**/api/doctor-invitations/register", (route) => {
    registerCalls += 1;
    return route.abort();
  });

  await page.goto("/register-doctor?token=validation-token", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Mật khẩu/).fill("weak");
  await page.getByLabel("Nhập lại mật khẩu").fill("different");
  await page.getByLabel("Số điện thoại").fill("123");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();

  const summary = page.locator(".doctor-error-summary");
  await expect(summary).toBeFocused();
  await expect(page.getByLabel("Họ và tên")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel(/^Mật khẩu/)).toHaveAttribute(
    "aria-describedby",
    "doctor-password-error",
  );
  await expect(summary.getByRole("link")).toHaveCount(4);
  expect(registerCalls).toBe(0);
});

test("new doctor registration stays blocked without a FacilityDepartment id", async ({ page }) => {
  await page.route("**/api/doctor-invitations/validate?token=no-facility-token", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        isValid: true,
        email: "new.doctor@example.com",
        doctorId: null,
        isLinkedToExistingDoctorProfile: false,
      },
    }),
  }));
  await page.route("**/api/facility-departments/active", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [{
        departmentId: "not-a-facility-department-id",
        facilityName: "Bệnh viện A",
        departmentName: "Khoa Tim mạch",
      }],
    }),
  }));

  await page.goto("/register-doctor?token=no-facility-token", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("status").filter({
    hasText: "Hệ thống chưa có dữ liệu khoa tại cơ sở y tế.",
  })).toBeVisible();
  await expect(page.getByLabel("Cơ sở y tế - khoa")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hoàn tất đăng ký" })).toBeDisabled();
});

test("all backend validation errors are displayed", async ({ page }) => {
  await mockLinkedInvitation(page, "backend-errors-token");
  await page.route("**/api/doctor-invitations/register", (route) => route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      message: "Register doctor failed.",
      errors: {
        Password: [
          "Passwords must be at least 8 characters.",
          "Passwords must have at least one digit.",
        ],
        PhoneNumber: "Phone number is invalid.",
      },
    }),
  }));

  await page.goto("/register-doctor?token=backend-errors-token", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Mật khẩu/).fill("Password123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123!");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();

  await expect(page.getByText("Passwords must be at least 8 characters.")).toBeVisible();
  await expect(page.getByText("Passwords must have at least one digit.")).toBeVisible();
  await expect(page.getByText("Phone number is invalid.")).toBeVisible();
});

test("expired token during submission switches to the invalid state", async ({ page }) => {
  await mockLinkedInvitation(page, "expires-on-submit-token");
  await page.route("**/api/doctor-invitations/register", (route) => route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      message: "Register doctor failed.",
      errors: ["Invitation link has expired."],
    }),
  }));

  await page.goto("/register-doctor?token=expires-on-submit-token", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Mật khẩu/).fill("Password123!");
  await page.getByLabel("Nhập lại mật khẩu").fill("Password123!");
  await page.getByRole("button", { name: "Hoàn tất đăng ký" }).click();

  await expect(page.getByRole("heading", { name: "Không thể tiếp tục đăng ký." })).toBeFocused();
  await expect(page.getByText("Invitation link has expired.", { exact: true })).toBeVisible();
});
