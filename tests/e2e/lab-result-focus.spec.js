import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const DOCTOR_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const LAB_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJEb2N0b3IiLCJ1c2VySWQiOiJkZGRkZGRkZC1kZGRkLTRkZGQtOGRkZC1kZGRkZGRkZGRkZGQifQ",
  "",
].join(".");

// Same doctor request/clinical-context contracts used by doctor-recovery-plan-ui.
// Every API and realtime request is intercepted; this never uses a live account.
async function openEmbeddedLabResult(page) {
  await preparePage(page);
  await page.addInitScript(({ accessToken, doctorId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken, userId: doctorId, roles: ["Doctor"], isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, doctorId: DOCTOR_ID });

  const labSession = {
    sessionId: LAB_SESSION_ID,
    status: "completed",
    testDate: "2026-08-17",
    aiSummary: "Có 1 chỉ số nằm ngoài khoảng tham chiếu.",
    results: [{
      resultDetailId: "ast-result",
      indicatorSymbol: "AST",
      indicatorName: "AST (GOT)",
      userValue: 52,
      referenceMinUsed: 8,
      referenceMaxUsed: 48,
      unit: "U/L",
      status: "high",
      advice: {
        summary: "AST cao hơn khoảng tham chiếu được dùng trong phiếu xét nghiệm.",
        lifestyleAdvice: ["Trao đổi với bác sĩ về thông tin trong phiếu xét nghiệm."],
        followUpSuggestion: ["Thông tin tham khảo: https://example.com/lab-reference"],
      },
    }],
  };
  const request = {
    id: REQUEST_ID,
    diseaseGroup: "respiratory",
    status: "assigned",
    requestNote: "Yêu cầu thử nghiệm giao diện.",
    requestedAt: "2026-08-04T08:00:00Z",
    acceptedAt: "2026-08-04T09:00:00Z",
    version: 1,
  };
  const clinicalContext = {
    patientProfile: { height: 170, weight: 68, bloodType: "O+" },
    userMedications: [],
    primaryLabTestSessionId: LAB_SESSION_ID,
    primaryLabTest: labSession,
    chronicDiseases: [],
  };
  await page.route("**/hubs/recovery-plans**", route => route.abort());
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path === "/api/users/me") data = { id: DOCTOR_ID, displayName: "Bác sĩ thử nghiệm", roles: ["Doctor"] };
    else if (path === `/api/doctor/recovery-plan-requests/${REQUEST_ID}`) data = request;
    else if (path === `/api/doctor/recovery-plan-requests/${REQUEST_ID}/clinical-context`) data = clinicalContext;
    else if (path === `/api/lab-tests/${LAB_SESSION_ID}`) data = labSession;
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ success: true, message: "OK", data, errors: [] }),
    });
  });

  await page.goto(`/app/staff/recovery-plan-requests/${REQUEST_ID}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Xem kết quả xét nghiệm ngày/ }).click();
  const dialog = page.getByRole("dialog", { name: "Kết quả xét nghiệm", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: /Kết quả ngày/ })).toBeVisible();
  return dialog;
}

async function expectFocusLoop(page, first, last) {
  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
}

for (const width of [1440, 390]) {
  test(`embedded lab modal traps focus only within the visible view at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const dialog = await openEmbeddedLabResult(page);
    const close = dialog.getByRole("button", { name: "Đóng kết quả xét nghiệm", exact: true });

    // Hidden indicator buttons must not become the overview's last tab stop.
    await expectFocusLoop(page, close, dialog.getByRole("button", { name: "Xem chỉ số cần chú ý", exact: true }));
    await dialog.getByRole("tab", { name: "Chỉ số xét nghiệm", exact: true }).click();
    const result = dialog.locator(".lab-test-result__result-card");
    await expect(result).toBeVisible();
    if (width < 960) {
      // On compact screens the mounted but hidden advice controls are excluded.
      await expectFocusLoop(page, close, result);
      await result.click();
      await expect(dialog.getByRole("button", { name: "Quay lại các chỉ số" })).toBeVisible();
    }

    // Native disclosure summaries participate in the loop; their closed
    // descendants do not. Opening a disclosure adds its now-visible link.
    const followUp = dialog.locator(".lab-test-result__advice-disclosure").filter({ hasText: "Theo dõi tiếp" });
    const summary = followUp.locator("summary");
    await expect(summary).toBeVisible();
    await expectFocusLoop(page, close, summary);
    await summary.click();
    const source = followUp.getByRole("link", { name: "Nguồn tham khảo" });
    await expect(source).toBeVisible();
    await expectFocusLoop(page, close, source);

    if (width < 960) {
      await dialog.getByRole("button", { name: "Quay lại các chỉ số" }).click();
      await expectFocusLoop(page, close, result);
    }
    await dialog.getByRole("tab", { name: "Tổng quan", exact: true }).click();
    await expectFocusLoop(page, close, dialog.getByRole("button", { name: "Xem chỉ số cần chú ý", exact: true }));
  });
}
