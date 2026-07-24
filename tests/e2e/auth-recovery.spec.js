import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

test("forgot password submits only the account email and shows a safe result", async ({ page }) => {
  let requestBody = null;

  await preparePage(page);
  await page.route("**/api/authentication/forgot-password", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Nếu email hợp lệ, hướng dẫn khôi phục sẽ được gửi đến bạn.",
      }),
    });
  });

  await openRoute(page, "/forgot-password");
  await page.getByLabel("Email").fill("patient@example.com");
  await page.getByRole("button", { name: "Gửi hướng dẫn" }).click();

  await expect(page.locator(".api-message.success")).toContainText(
    "Nếu email hợp lệ, hướng dẫn khôi phục sẽ được gửi đến bạn.",
  );
  await expect(page.getByRole("link", { name: "Tôi đã có mã xác thực" }))
    .toHaveAttribute("href", "/change-password");
  await expect(page.getByRole("link", { name: "Quay lại đăng nhập" }))
    .toHaveAttribute("href", "/login");
  expect(requestBody).toEqual({ email: "patient@example.com" });
});

test("forgot password announces backend failures without clearing the email", async ({ page }) => {
  await preparePage(page);
  await page.route("**/api/authentication/forgot-password", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      message: "Chưa thể gửi hướng dẫn. Vui lòng thử lại.",
    }),
  }));

  await openRoute(page, "/forgot-password");
  await page.getByLabel("Email").fill("patient@example.com");
  await page.getByRole("button", { name: "Gửi hướng dẫn" }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Chưa thể gửi hướng dẫn. Vui lòng thử lại.",
  );
  await expect(page.getByLabel("Email")).toHaveValue("patient@example.com");
});

test("change password submits the existing reset contract and keeps recovery links", async ({ page }) => {
  let requestBody = null;

  await preparePage(page);
  await page.route("**/api/authentication/change-password", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.",
      }),
    });
  });

  await openRoute(page, "/change-password");
  await page.getByLabel("Email").fill("patient@example.com");
  await page.getByLabel("Mã xác thực").fill("reset-code");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill("SecurePass!2026");
  await page.getByLabel("Nhập lại mật khẩu mới").fill("SecurePass!2026");
  await page.getByRole("button", { name: "Đổi mật khẩu" }).click();

  await expect(page.locator(".api-message.success")).toContainText(
    "Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.",
  );
  await expect(page.getByRole("link", { name: "Gửi lại mã" }))
    .toHaveAttribute("href", "/forgot-password");
  await expect(page.locator("form").getByRole("link", { name: "Đăng nhập" }))
    .toHaveAttribute("href", "/login");
  expect(requestBody).toEqual({
    email: "patient@example.com",
    otp: "reset-code",
    newPassword: "SecurePass!2026",
    confirmNewPassword: "SecurePass!2026",
  });
});

test("change password blocks mismatched confirmation and focuses the field", async ({ page }) => {
  let requestCalls = 0;

  await preparePage(page);
  await page.route("**/api/authentication/change-password", async (route) => {
    requestCalls += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await openRoute(page, "/change-password");
  await page.getByLabel("Email").fill("patient@example.com");
  await page.getByLabel("Mã xác thực").fill("reset-code");
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill("SecurePass!2026");
  const confirmation = page.getByLabel("Nhập lại mật khẩu mới");
  await confirmation.fill("DifferentPass!2026");
  await page.getByRole("button", { name: "Đổi mật khẩu" }).click();

  await expect(page.getByRole("alert")).toContainText("Mật khẩu mới nhập lại chưa khớp.");
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toHaveValue("DifferentPass!2026");
  expect(requestCalls).toBe(0);
});
