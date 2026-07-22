import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

test("admin retries a failed AI config list and receives an empty state", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  let aiConfigRequestCount = 0;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (pathname === "/api/ai-configs") {
      aiConfigRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (aiConfigRequestCount <= 2) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Sensitive AI platform detail" }),
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

    const pagedPaths = ["/api/users", "/api/doctors", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin/ai-configs", { waitUntil: "domcontentloaded" });

  const errorState = page.getByRole("status").filter({ hasText: "Không thể tải danh sách cấu hình AI" });
  await expect(errorState).toBeVisible();
  await expect(errorState).toContainText("Vui lòng kiểm tra kết nối và thử tải lại danh sách cấu hình.");
  await expect(errorState).not.toContainText("Sensitive AI platform detail");

  const retryButton = errorState.getByRole("button", { name: "Thử tải lại" });
  await retryButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByText("Chưa có cấu hình AI phù hợp", { exact: true })).toBeVisible();
  await expect(page.getByText("Trang 1 / 1 · 0 / 0 cấu hình", { exact: true })).toBeVisible();
  expect(aiConfigRequestCount).toBe(3);
});

test("AI config list keeps long prompt and model content within a semantic table", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, ADMIN_TOKEN);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }
    if (pathname === "/api/ai-configs") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [{
              id: "config-1",
              configName: "ConsultationDoctorQuestionsWithANameThatMustWrap",
              taskType: "ConsultationDoctorQuestions",
              systemPrompt: "Nhiệm vụ của bạn là tạo các câu hỏi lâm sàng rõ ràng, an toàn và có đủ ngữ cảnh cho người bệnh trước khi khám.",
              model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
              temperature: 0.2,
              maxTokens: null,
              isActive: true,
              updatedAt: "2026-07-14T21:00:00Z",
            }],
            pageNumber: 1,
            pageSize: 10,
            totalCount: 1,
            totalPages: 1,
          },
        }),
      });
    }
    const pagedPaths = ["/api/users", "/api/doctors", "/api/medical-facilities"];
    const data = pagedPaths.includes(pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });

  await page.goto("/app/admin/ai-configs", { waitUntil: "domcontentloaded" });

  const table = page.getByRole("table", { name: "Danh sách cấu hình AI" });
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Vai trò hệ thống / Prompt" })).toBeVisible();
  await expect(page.getByText("Đang bật", { exact: true }).last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Xem" })).toHaveCSS("min-height", "40px");
});
