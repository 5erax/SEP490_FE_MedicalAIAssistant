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

test("diagnosis flow asks clinical yes/no questions and renders recommendations", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    window.name = "__medimate_e2e_prepared__";
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
      isPremium: true,
    }));
  }, ACCESS_TOKEN);

  let questionPayload = null;
  let answerPayload = null;

  await page.route("**/api/patient-profiles**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { items: [] } }),
  }));

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
            questionVi: "Ban co dau nguc khi gang suc khong?",
            chapterCode: "IX",
            totalScore: 12,
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
          userInput: "Dau nguc nhe",
          answers: [{ questionId: QUESTION_ID, answer: true }],
          analysis: {
            sessionId: SESSION_ID,
            primaryDiagnosis: {
              rank: 1,
              diseaseName: "Dau that nguc",
              icd10Code: "I20",
              paGivenB: 0.91,
              clinicalReasoning: "Phu hop voi trieu chung mo ta.",
            },
            diagnoses: [{
              rank: 1,
              diseaseName: "Dau that nguc",
              icd10Code: "I20",
              paGivenB: 0.91,
              clinicalReasoning: "Phu hop voi trieu chung mo ta.",
            }],
            recommendedDepartment: {
              departmentId: DEPARTMENT_ID,
              departmentName: "Tim mach",
              confidenceScore: 0.91,
              reason: "Can danh gia chuyen khoa tim mach.",
              priorityRank: 1,
              isEmergencySuggested: false,
            },
            recommendedFacilities: [{
              id: FACILITY_ID,
              facilityName: "Benh vien Tim",
              address: "123 Nguyen Trai",
              latitude: 10.77,
              longitude: 106.69,
              phone: "0123456789",
              isActive: true,
              departments: [{ departmentId: DEPARTMENT_ID, departmentName: "Tim mach" }],
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
          diseaseName: "Dau that nguc",
          icd10Code: "I20",
          paGivenB: 0.91,
          clinicalReasoning: "Phu hop voi trieu chung mo ta.",
        }],
      },
    }),
  }));

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Trieu chung chinh").fill("Dau nguc nhe");
  await page.getByLabel("Mo ta them").fill("Dau nguc nhe khi gang suc");
  await page.getByRole("button", { name: "Tao cau hoi lam sang" }).click();

  await expect(page).toHaveURL(new RegExp(`/assessment/${SESSION_ID}$`));
  await expect(page.getByText("Ban co dau nguc khi gang suc khong?")).toBeVisible();
  await page.getByLabel("Co").check();
  await page.getByRole("button", { name: "Xem ket qua" }).click();

  await expect(page).toHaveURL(new RegExp(`/assessment/${SESSION_ID}/result$`));
  await expect(page.getByText("Dau that nguc", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tim mach", { exact: true })).toBeVisible();
  await expect(page.getByText("Benh vien Tim", { exact: true })).toBeVisible();
  await expect(page.getByText("91% phu hop", { exact: true })).toBeVisible();
  expect(questionPayload.userInput).toContain("Trieu chung chinh: Dau nguc nhe");
  expect(questionPayload.userInput).toContain("Mo ta them: Dau nguc nhe khi gang suc");
  expect(answerPayload).toEqual({
    sessionId: SESSION_ID,
    answers: [{ questionId: QUESTION_ID, answer: true }],
  });
});
