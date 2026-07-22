import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiaXNQcmVtaXVtIjp0cnVlfQ",
  "",
].join(".");

const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";

test("diagnosis flow asks clinical questions and renders recommendations", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
      isPremium: true,
    }));
  }, ACCESS_TOKEN);

  let questionPayload = null;
  let answerPayload = null;

  await page.route("**/api/symptom-analysis/suggest-clinical-questions", async (route) => {
    questionPayload = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          sessionId: SESSION_ID,
          questions: [{
            questionId: QUESTION_ID,
            questionVi: "Do you have chest pain during exertion?",
            chapterCode: "IX",
            totalScore: 12,
            answers: {
              "Do you have chest pain during exertion?": "",
            },
          }],
        },
      }),
    });
  });

  await page.route("**/api/symptom-analysis/submit-clinical-question-answers", async (route) => {
    answerPayload = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          sessionId: SESSION_ID,
          userInput: "Trieu chung chinh: Mild chest pain\nMo ta them: Mild chest pain during exertion\nMuc do: moderate",
          answers: [{ questionId: QUESTION_ID, answers: { "Do you have chest pain during exertion?": true } }],
          analysis: {
            sessionId: SESSION_ID,
            primaryDiagnosis: {
              rank: 1,
              diseaseName: "Angina",
              icd10Code: "I20",
              paGivenB: 0.91,
              clinicalReasoning: "Matches the described symptoms.",
            },
            diagnoses: [{
              rank: 1,
              diseaseName: "Angina",
              icd10Code: "I20",
              paGivenB: 0.91,
              clinicalReasoning: "Matches the described symptoms.",
            }],
            recommendedDepartment: {
              departmentId: DEPARTMENT_ID,
              departmentName: "Cardiology",
              confidenceScore: 0.91,
              reason: "Specialist review is recommended.",
              priorityRank: 1,
              isEmergencySuggested: false,
            },
            recommendedFacilities: [{
              id: FACILITY_ID,
              facilityName: "Heart Hospital",
              address: "123 Nguyen Trai",
              latitude: 10.77,
              longitude: 106.69,
              phone: "0123456789",
              isActive: true,
              departments: [{ departmentId: DEPARTMENT_ID, departmentName: "Cardiology" }],
            }],
          },
        },
      }),
    });
  });

  await page.route("**/api/symptom-analysis/submit-diagnosis", async (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        sessionId: SESSION_ID,
        model: "google/medgemma-4b-it",
        diagnoses: [{
          rank: 1,
          diseaseName: "Angina",
          icd10Code: "I20",
          paGivenB: 0.91,
          clinicalReasoning: "Matches the described symptoms.",
        }],
      },
    }),
  }));

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  await page.locator("#intake-mainSymptom").fill("Mild chest pain");
  await page.locator("#intake-description").fill("Mild chest pain during exertion");
  await page.locator(".intake-form").getByRole("button").first().click();

  await expect(page.getByText("Bạn có đau ngực khi gắng sức không?")).toBeVisible();
  await expect(page.getByText("Gốc tiếng Anh: Do you have chest pain during exertion?").first()).toBeVisible();
  await page.locator(".boolean-answer-group").getByRole("radio").first().check();
  await page.getByRole("button", { name: "Xem gợi ý" }).click();

  await expect(page.getByText("Angina", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Cardiology", { exact: true })).toBeVisible();
  await expect(page.getByText("Heart Hospital", { exact: true })).toBeVisible();
  await expect(page.getByText("91%", { exact: true }).first()).toBeVisible();
  expect(questionPayload).toEqual({
    userInput: "Trieu chung chinh: Mild chest pain\nMo ta them: Mild chest pain during exertion\nMuc do: moderate",
  });
  expect(answerPayload).toEqual({
    sessionId: SESSION_ID,
    answers: [{ questionId: QUESTION_ID, answers: { "Do you have chest pain during exertion?": true } }],
  });
});

test("opens all clinical history and session detail in a sidebar without navigating", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
      isPremium: true,
    }));
  }, ACCESS_TOKEN);

  const firstSessionId = "44444444-4444-4444-8444-444444444444";
  const requestedPages = [];
  const historySessions = [
    {
      sessionId: firstSessionId,
      inputText: "Đau ngực khi gắng sức",
      sessionType: "diagnoses",
      status: "completed",
      createdAt: "2026-07-22T02:00:00Z",
    },
    {
      sessionId: "55555555-5555-4555-8555-555555555555",
      inputText: "Sốt nhẹ kéo dài",
      sessionType: "diagnoses",
      status: "completed",
      createdAt: "2026-07-21T02:00:00Z",
    },
  ];

  await page.route("**/api/symptom-analysis/my-sessions**", async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get("PageNumber"));
    requestedPages.push({
      pageNumber,
      sessionType: url.searchParams.get("sessionType"),
    });
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          pageNumber,
          pageSize: 50,
          totalCount: historySessions.length,
          totalPages: 2,
          items: [historySessions[pageNumber - 1]],
        },
      }),
    });
  });

  await page.route(`**/api/symptom-analysis/${firstSessionId}`, async (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        ...historySessions[0],
        diagnoses: [{ diseaseName: "Đau thắt ngực" }],
      },
    }),
  }));

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  const initialUrl = page.url();
  const historyTrigger = page.getByRole("button", { name: "Lịch sử phân tích" });

  await historyTrigger.click();

  const drawer = page.getByRole("dialog", { name: "Lịch sử phân tích lâm sàng" });
  await expect(page).toHaveURL(initialUrl);
  await expect(historyTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Đau ngực khi gắng sức", { exact: true })).toBeVisible();
  await expect(drawer.getByText("Sốt nhẹ kéo dài", { exact: true })).toBeVisible();
  expect(requestedPages).toEqual([
    { pageNumber: 1, sessionType: "diagnoses" },
    { pageNumber: 2, sessionType: "diagnoses" },
  ]);

  const accessibility = await new AxeBuilder({ page })
    .include(".analysis-history-panel")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations.filter(
    (violation) => ["critical", "serious"].includes(violation.impact),
  );
  expect(seriousViolations).toEqual([]);

  await drawer.locator("article", { hasText: "Đau ngực khi gắng sức" })
    .getByRole("button", { name: "Chi tiết" })
    .click();
  await expect(drawer.getByRole("heading", { name: "Chi tiết phiên" })).toBeVisible();
  await expect(drawer.getByText("Đau thắt ngực", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(initialUrl);

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(historyTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(historyTrigger).toBeFocused();
  await expect(page).toHaveURL(initialUrl);
});
