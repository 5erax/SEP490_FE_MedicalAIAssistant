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
            questionVi: "Bạn có đau ngực khi gắng sức không?",
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
          userInput: "Đau ngực nhẹ",
          answers: [{ questionId: QUESTION_ID, answer: true }],
          analysis: {
            sessionId: SESSION_ID,
            primaryDiagnosis: {
              rank: 1,
              diseaseName: "Đau thắt ngực",
              icd10Code: "I20",
              paGivenB: 0.91,
              clinicalReasoning: "Phù hợp với triệu chứng mô tả.",
            },
            diagnoses: [{
              rank: 1,
              diseaseName: "Đau thắt ngực",
              icd10Code: "I20",
              paGivenB: 0.91,
              clinicalReasoning: "Phù hợp với triệu chứng mô tả.",
            }],
            recommendedDepartment: {
              departmentId: DEPARTMENT_ID,
              departmentName: "Tim mạch",
              confidenceScore: 0.91,
              reason: "Cần đánh giá chuyên khoa tim mạch.",
              priorityRank: 1,
              isEmergencySuggested: false,
            },
            recommendedFacilities: [{
              id: FACILITY_ID,
              facilityName: "Bệnh viện Tim",
              address: "123 Nguyễn Trãi",
              latitude: 10.77,
              longitude: 106.69,
              phone: "0123456789",
              isActive: true,
              departments: [{ departmentId: DEPARTMENT_ID, departmentName: "Tim mạch" }],
            }],
          },
        },
      }),
    });
  });

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  await page.locator("textarea").first().fill("Đau ngực nhẹ");
  await page.getByRole("button", { name: "Bắt đầu sàng lọc" }).click();

  await expect(page.getByText("Bạn có đau ngực khi gắng sức không?")).toBeVisible();
  await expect(page.locator(".question-card")).toBeFocused();
  await page.getByLabel("Có").check();
  await page.getByRole("button", { name: "Xem nhận định tham khảo" }).click();

  await expect(page.getByText("Đau thắt ngực", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Tim mạch", { exact: true })).toBeVisible();
  await expect(page.getByText("Bệnh viện Tim", { exact: true })).toBeVisible();
  await expect(page.getByText("91%", { exact: true }).first()).toBeVisible();
  expect(questionPayload).toEqual({ userInput: "Đau ngực nhẹ" });
  expect(answerPayload).toEqual({
    sessionId: SESSION_ID,
    answers: [{ questionId: QUESTION_ID, answer: true }],
  });
});
