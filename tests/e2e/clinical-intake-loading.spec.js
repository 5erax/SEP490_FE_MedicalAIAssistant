import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const SYMPTOMS = "Tôi bị ho khan kéo dài nhiều ngày";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  Buffer.from(JSON.stringify({ exp: 4142368000, role: "Patient", userId: USER_ID })).toString("base64url"),
  "",
].join(".");

async function prepareIntake(page, { exhausted = false } = {}) {
  await preparePage(page);
  await page.addInitScript(auth => localStorage.setItem("medimate.auth", JSON.stringify(auth)), {
    accessToken: ACCESS_TOKEN, userId: USER_ID, roles: ["Patient"], isProfileCompleted: true,
  });
  const state = { requests: 0, pending: [] };
  state.respond = (status, body) => {
    const resolve = state.pending.shift();
    expect(resolve, "A mocked question request must be pending").toBeTruthy();
    resolve({ status, contentType: "application/json", body: JSON.stringify(body) });
  };
  state.releaseAll = () => {
    for (const resolve of state.pending.splice(0)) {
      resolve({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false }) });
    }
  };
  await page.route("**/api/**", async route => {
    const pathname = new URL(route.request().url()).pathname;
    let data = [];
    if (pathname === "/api/users/me") {
      data = { id: USER_ID, userId: USER_ID, roles: ["Patient"], displayName: "Người dùng kiểm thử", isProfileCompleted: true };
    } else if (pathname === "/api/symptom-analysis/quota") {
      data = { limitPerDay: 5, remainingToday: exhausted ? 0 : 5, usedToday: exhausted ? 5 : 0, hasServiceCredit: true };
    } else if (pathname === "/api/symptom-analysis/suggest-clinical-questions") {
      state.requests += 1;
      // Keep the actual browser request pending until the test deliberately releases it.
      const response = await new Promise(resolve => state.pending.push(resolve));
      return route.fulfill(response);
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/dashboard");
  await expect(page.locator(".specialty-quota-badge.is-loading")).toHaveCount(0);
  return state;
}

async function expectNoHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function expectStableLoadingButton(submit, idleBounds) {
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute("aria-busy", "true");
  await expect(submit).toHaveAccessibleName("Đang tạo câu hỏi...");
  await expect(submit).toHaveAttribute("title", "Đang tạo câu hỏi...");
  await expect(submit).toHaveCSS("opacity", "1");
  const spinner = submit.locator(".ui-button-spinner");
  await expect(spinner).toBeVisible();
  await expect(spinner).toHaveAttribute("aria-hidden", "true");
  expect(await submit.innerText()).not.toContain("Đang tạo câu hỏi");
  const buttonBounds = await submit.boundingBox();
  const spinnerBounds = await spinner.boundingBox();
  expect(Math.abs(buttonBounds.width - idleBounds.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(buttonBounds.height - idleBounds.height)).toBeLessThanOrEqual(1);
  expect(spinnerBounds.x).toBeGreaterThanOrEqual(buttonBounds.x);
  expect(spinnerBounds.y).toBeGreaterThanOrEqual(buttonBounds.y);
  expect(spinnerBounds.x + spinnerBounds.width).toBeLessThanOrEqual(buttonBounds.x + buttonBounds.width);
  expect(spinnerBounds.y + spinnerBounds.height).toBeLessThanOrEqual(buttonBounds.y + buttonBounds.height);
  expect(Math.abs(spinnerBounds.x + spinnerBounds.width / 2 - buttonBounds.x - buttonBounds.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(spinnerBounds.y + spinnerBounds.height / 2 - buttonBounds.y - buttonBounds.height / 2)).toBeLessThanOrEqual(1);
}

for (const { width, dark = false } of [
  { width: 1440 }, { width: 768 }, { width: 390 }, { width: 320 }, { width: 390, dark: true },
]) {
  test(`symptom submit stays stable through loading, failure and retry at ${width}px${dark ? " in dark mode" : ""}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    if (dark) await page.emulateMedia({ colorScheme: "dark" });
    const state = await prepareIntake(page);
    try {
      if (dark) {
        // The application's dark palette is attribute-driven, not media-only.
        await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      }
      const input = page.getByLabel("Triệu chứng bạn đang gặp");
      const submit = page.locator(".studio-submit-icon");
      const status = page.locator(".studio-chat-actions .studio-status");
      await input.fill(SYMPTOMS);
      await expect(submit).toBeEnabled();
      await expect(submit).toHaveAccessibleName("Gửi triệu chứng");
      await expect(submit.locator("svg")).toBeVisible();
      await expect(submit.locator(".ui-button-spinner")).toHaveCount(0);
      await submit.scrollIntoViewIfNeeded();
      const idleBounds = await submit.boundingBox();
      await submit.click();
      await expect.poll(() => state.requests).toBe(1);
      await page.locator(".studio-chat-actions").screenshot({ path: testInfo.outputPath("pending-submit.png") });
      await expectStableLoadingButton(submit, idleBounds);
      await expect(status).toHaveAttribute("aria-live", "polite");
      await expect(status).toHaveText("Đang tạo câu hỏi...");
      await expect(input).toBeDisabled();
      await expectNoHorizontalOverflow(page);

      // Native clicks on a disabled control must not start another request.
      await submit.evaluate(button => { button.click(); button.click(); });
      expect(state.requests).toBe(1);
      state.respond(503, { success: false, message: "Dịch vụ tạm thời không khả dụng." });
      await expect(page.getByText("Không thể kết nối dịch vụ gợi ý chuyên khoa", { exact: true })).toBeVisible();
      await expect(submit).toBeEnabled();
      await expect(submit).not.toHaveAttribute("aria-busy", "true");
      await expect(submit).toHaveAccessibleName("Gửi triệu chứng");
      await expect(submit).toHaveAttribute("title", "Gửi triệu chứng");
      await expect(submit.locator(".ui-button-spinner")).toHaveCount(0);
      await expect(submit.locator("svg")).toBeVisible();
      await expect(input).toBeEnabled();
      await expect(input).toHaveValue(SYMPTOMS);
      await expect(status).not.toContainText("Đang tạo câu hỏi");
      expect(state.requests).toBe(1);

      await submit.click();
      await expect.poll(() => state.requests).toBe(2);
      await expectStableLoadingButton(submit, idleBounds);
      state.respond(200, { success: true, data: {
        sessionId: SESSION_ID,
        questions: [{ questionId: QUESTION_ID, questionVi: "Bạn có ho khan không?", answers: { "ho khan": "dry cough" } }],
      } });
      await expect(page.locator(".specialty-question-flow")).toBeVisible();
      await expect(page.getByText("Bạn có ho khan không?", { exact: true })).toBeVisible();
      await expect(submit).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      expect(state.requests).toBe(2);
    } finally {
      state.releaseAll();
    }
  });
}

test("exhausted daily quota disables submit without presenting an in-progress request", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const state = await prepareIntake(page, { exhausted: true });
  const submit = page.locator(".studio-submit-icon");
  await expect(submit).toBeDisabled();
  await expect(submit).not.toHaveAttribute("aria-busy", "true");
  await expect(submit.locator(".ui-button-spinner")).toHaveCount(0);
  await expect(submit.locator("svg")).toBeVisible();
  await expect(page.locator(".studio-chat-actions .studio-status")).toContainText("Đã hết lượt hôm nay.");
  await expect(page.locator(".studio-chat-actions .studio-status")).not.toContainText("Đang tạo câu hỏi");
  await submit.evaluate(button => button.click());
  expect(state.requests).toBe(0);
  await expectNoHorizontalOverflow(page);
});
