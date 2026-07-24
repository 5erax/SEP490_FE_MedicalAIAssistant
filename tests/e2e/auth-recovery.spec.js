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
