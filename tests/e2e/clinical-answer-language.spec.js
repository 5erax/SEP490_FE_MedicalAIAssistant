import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const ANSWERS = {
  ho: "cough",
  "ho khan": "dry cough",
  "ho đờm": "productive cough",
  "ho kéo dài nhiều ngày": "persistent cough",
};
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  Buffer.from(JSON.stringify({ exp: 4142368000, role: "Patient", userId: USER_ID })).toString("base64url"),
  "",
].join(".");

async function prepareClinicalIntake(page) {
  await preparePage(page);
  await page.addInitScript(auth => localStorage.setItem("medimate.auth", JSON.stringify(auth)), {
    accessToken: ACCESS_TOKEN, userId: USER_ID, roles: ["Patient"], isProfileCompleted: true,
  });
  const state = { submitted: null, catalogRequests: 0 };
  await page.route("**/api/**", route => {
    const pathname = new URL(route.request().url()).pathname;
    let data = [];
    if (pathname === "/api/users/me") {
      data = { id: USER_ID, userId: USER_ID, roles: ["Patient"], displayName: "Người dùng kiểm thử", isProfileCompleted: true };
    } else if (pathname === "/api/symptom-analysis/quota") {
      data = { limitPerDay: 5, remainingToday: 5, usedToday: 0, hasServiceCredit: true };
    } else if (pathname === "/api/symptom-analysis/suggest-clinical-questions") {
      data = { sessionId: SESSION_ID, questions: [{
        questionId: QUESTION_ID,
        questionVi: "Bạn có ho, ho khan, ho đờm hoặc ho kéo dài nhiều ngày không?",
        answers: ANSWERS,
      }] };
    } else if (pathname === "/api/symptom-analysis/submit-clinical-question-answers") {
      state.submitted = route.request().postDataJSON();
      // Stop at the submitted answers; map/results are deliberately outside this regression.
      return route.fulfill({
        status: 503, contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Dịch vụ tạm thời không khả dụng." }),
      });
    } else if (pathname.startsWith("/api/clinical-questions")) {
      state.catalogRequests += 1;
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
  });
  await page.goto("/dashboard");
  return state;
}

for (const width of [1440, 390]) {
  test(`clinical answer labels use the Vietnamese admin text at ${width}px without changing submissions`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await prepareClinicalIntake(page);
    await page.getByLabel("Triệu chứng bạn đang gặp").fill("Ho khan kéo dài");
    await page.getByRole("button", { name: "Gửi triệu chứng", exact: true }).click();
    const rows = page.locator(".specialty-answer-row");
    await expect(rows.locator(":scope > strong")).toHaveText(Object.keys(ANSWERS));
    await expect(page.locator(".specialty-answer-list")).not.toContainText(/dry ho|dry cough|productive cough|persistent cough/i);
    const submit = page.getByRole("button", { name: "Xem gợi ý", exact: true });
    await expect(submit).toBeDisabled();
    const selection = [false, true, false, true];
    for (let index = 0; index < selection.length; index += 1) {
      await rows.nth(index).getByRole("button", { name: selection[index] ? "Có" : "Không", exact: true }).click();
    }
    await expect(submit).toBeEnabled();
    await page.screenshot({ path: testInfo.outputPath("vietnamese-answers.png"), fullPage: true });
    await submit.click();
    await expect.poll(() => state.submitted).toEqual({
      sessionId: SESSION_ID,
      answers: [{ questionId: QUESTION_ID, answers: {
        ho: false, "ho khan": true, "ho đờm": false, "ho kéo dài nhiều ngày": true,
      } }],
    });
    expect(state.catalogRequests).toBe(0);
  });
}

test("answer language fix retains legacy choices, single prompts and existing key normalization", async ({ page }) => {
  await prepareClinicalIntake(page);
  const actual = await page.evaluate(async () => {
    const api = await import("/src/services/symptomAnalysisService.js");
    const legacyPrompt = "Do you have chest pain during exertion?";
    const single = { questionId: "single", answers: { [legacyPrompt]: "" } };
    const singleChoice = api.getClinicalQuestionAnswerOptions(single)[0][0];
    const trimmed = { questionId: "trimmed", answers: { " ho khan ": " dry cough ", " ho đờm ": " productive cough " } };
    return {
      legacyChoices: api.getClinicalQuestionAnswerOptions({ answers: { yes: "Có", no: "Không" } }),
      adminChoices: api.getClinicalQuestionAnswerOptions({ answers: { Có: "Yes", Không: "No" } }),
      legacyLabels: api.getClinicalQuestionBooleanPrompts({ answers: { mild: "Nhẹ", severe: "Nặng" } }).map(item => item.label),
      prompts: api.getClinicalQuestionBooleanPrompts(trimmed).map(({ key, label }) => ({ key, label })),
      payload: api.buildClinicalQuestionAnswerItems([trimmed], { trimmed: { "ho khan": true, "ho đờm": false } }),
      singleMode: api.getClinicalQuestionAnswerMode(single),
      singlePayload: api.buildClinicalQuestionAnswerItems([single], { single: singleChoice }),
    };
  });
  expect(actual).toEqual({
    legacyChoices: [["yes", "Có"], ["no", "Không"]],
    adminChoices: [["Có", "Có"], ["Không", "Không"]],
    legacyLabels: ["Nhẹ", "Nặng"],
    prompts: [{ key: "ho khan", label: "ho khan" }, { key: "ho đờm", label: "ho đờm" }],
    payload: [{ questionId: "trimmed", answers: { "ho khan": true, "ho đờm": false } }],
    singleMode: "choice",
    singlePayload: [{ questionId: "single", answers: { "Do you have chest pain during exertion?": true } }],
  });
});
