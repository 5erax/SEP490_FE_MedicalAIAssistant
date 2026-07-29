import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");
const SESSION_ID = "44444444-4444-4444-8444-444444444444";

test("analysis history localizes state and retries with safe errors", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
      isPremium: true,
      isProfileCompleted: true,
    }));
  }, ACCESS_TOKEN);

  let historyRequests = 0;
  let detailRequests = 0;
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "55555555-5555-4555-8555-555555555555",
            displayName: "Nguyễn Minh",
          },
        }),
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

    if (url.pathname === "/api/symptom-analysis/my-sessions") {
      historyRequests += 1;
      if (historyRequests === 1) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Internal model secret detail" }),
        });
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            pageNumber: 1,
            pageSize: 50,
            totalCount: 1,
            totalPages: 1,
            items: [{
              sessionId: SESSION_ID,
              inputText: "Đau đầu kéo dài",
              sessionType: "diagnoses",
              status: "completed",
              createdAt: "2026-07-22T02:00:00Z",
            }],
          },
        }),
      });
    }

    if (url.pathname === `/api/symptom-analysis/${SESSION_ID}`) {
      detailRequests += 1;
      if (detailRequests === 1) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Raw provider response must stay hidden" }),
        });
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: SESSION_ID,
            inputText: "Đau đầu kéo dài",
            diagnoses: [{ diseaseName: "Đau đầu căng thẳng" }],
          },
        }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Lịch sử phân tích" }).click();

  const drawer = page.getByRole("dialog", { name: "Lịch sử phân tích lâm sàng" });
  await expect(drawer.getByText("Chưa thể tải lịch sử phân tích. Vui lòng thử lại.")).toBeVisible();
  await expect(drawer.getByText("Internal model secret detail", { exact: false })).toHaveCount(0);

  await drawer.getByRole("button", { name: "Thử lại" }).click();
  await expect(drawer.getByText("Phân tích lâm sàng · Hoàn tất", { exact: true })).toBeVisible();
  expect(historyRequests).toBe(2);

  await drawer.getByRole("button", { name: "Chi tiết" }).click();
  const detail = drawer.locator(".analysis-history-detail");
  await expect(detail.getByText("Chưa thể tải chi tiết phiên. Vui lòng thử lại.")).toBeVisible();
  await expect(detail.getByText("Raw provider response", { exact: false })).toHaveCount(0);

  await detail.getByRole("button", { name: "Thử lại" }).click();
  await expect(detail.getByText("Đau đầu căng thẳng", { exact: true })).toBeVisible();
  expect(detailRequests).toBe(2);

  const accessibility = await new AxeBuilder({ page })
    .include(".analysis-history-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const releaseBlockingViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
  expect(releaseBlockingViolations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
});

test("chat route keeps the Trợ lý AI page identity", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
      isPremium: true,
      isProfileCompleted: true,
    }));
  }, ACCESS_TOKEN);

  await page.route("**/api/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: new URL(route.request().url()).pathname === "/api/users/me"
        ? { id: "55555555-5555-4555-8555-555555555555", displayName: "Nguyễn Minh" }
        : [],
    }),
  }));

  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".user-shell-title h1")).toHaveText("Trợ lý AI");
  await expect(page).toHaveTitle("Chat với trợ lý AI | MediMate AI");
});
