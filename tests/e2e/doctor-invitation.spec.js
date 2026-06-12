import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await preparePage(page);
});

test("linked doctor profile submits only account fields", async ({ page }) => {
  let registerBody = null;

  await page.route("**/api/doctor-invitations/validate?token=linked-token", (route) => route.fulfill({
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
      },
    }),
  }));

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
