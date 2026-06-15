import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";

test.describe("patient specialty intake", () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
  });

  test("asks follow-up questions and recommends a matching hospital in place", async ({ page }) => {
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
              questionVi: "Bạn có sốt trên 38 độ không?",
              chapterCode: "X",
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
            analysis: {
              primaryDiagnosis: {
                rank: 1,
                diseaseName: "Viêm họng cấp",
                icd10Code: "J02",
                paGivenB: 0.86,
                clinicalReasoning: "Phù hợp với sốt nhẹ và đau họng.",
              },
              diagnoses: [{
                rank: 1,
                diseaseName: "Viêm họng cấp",
                paGivenB: 0.86,
              }],
              recommendedDepartment: {
                departmentId: DEPARTMENT_ID,
                departmentName: "Tai Mũi Họng",
                confidenceScore: 0.86,
                reason: "Nên khám chuyên khoa tai mũi họng.",
              },
              recommendedFacilities: [{
                id: "11111111-1111-4111-8111-111111111111",
                facilityName: "Bệnh viện Tai Mũi Họng",
                address: "123 Nguyễn Trãi",
                rating: 4.7,
                latitude: 10.77,
                longitude: 106.69,
                isActive: true,
                departments: [{ departmentId: DEPARTMENT_ID, departmentName: "Tai Mũi Họng" }],
              }],
            },
          },
        }),
      });
    });

    await openRoute(page, "/dashboard");

    const symptoms = page.getByLabel("Triệu chứng bạn đang gặp");
    const submit = page.getByRole("button", { name: "Gợi ý chuyên khoa" });

    await expect(symptoms).toHaveAttribute(
      "aria-describedby",
      /specialty-symptoms-hint/,
    );
    await expect(submit).toBeDisabled();
    await expect(page.getByText("Khi nào cần cấp cứu?")).toBeVisible();

    await page.getByRole("button", { name: "Sốt nhẹ 2 ngày kèm đau họng" }).click();
    await expect(symptoms).toHaveValue("Sốt nhẹ 2 ngày kèm đau họng");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Bạn có sốt trên 38 độ không?")).toBeVisible();

    await page.getByLabel("Có").check();
    await page.getByRole("button", { name: "Xem chẩn đoán và bệnh viện phù hợp" }).click();

    await expect(page.getByText("Viêm họng cấp", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tai Mũi Họng", { exact: true })).toBeVisible();
    await expect(page.getByText("Bệnh viện Tai Mũi Họng", { exact: true })).toBeVisible();
    await expect(page.getByText("4.7 sao đánh giá")).toBeVisible();

    expect(questionPayload).toEqual({ userInput: "Sốt nhẹ 2 ngày kèm đau họng" });
    expect(answerPayload).toEqual({
      sessionId: SESSION_ID,
      answers: [{ questionId: QUESTION_ID, answer: true }],
    });
  });

  test("accepts nested backend question response shapes", async ({ page }) => {
    await page.route("**/api/symptom-analysis/suggest-clinical-questions", async (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          result: {
            sessionID: SESSION_ID,
            clinicalQuestionSuggestions: [{
              id: QUESTION_ID,
              questionText: "Bạn có ho kéo dài trên 3 ngày không?",
            }],
          },
        },
      }),
    }));

    await openRoute(page, "/dashboard");
    await page.getByLabel("Triệu chứng bạn đang gặp").fill("Ho và đau họng");
    await page.getByRole("button", { name: "Gợi ý chuyên khoa" }).click();

    await expect(page.getByText("Bạn có ho kéo dài trên 3 ngày không?")).toBeVisible();
    await expect(page.getByText("AI chưa có câu hỏi phù hợp")).toBeHidden();
  });
});
