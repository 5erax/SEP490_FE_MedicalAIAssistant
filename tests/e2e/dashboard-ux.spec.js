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
const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const MAP_STYLE = {
  version: 8,
  name: "E2E map style",
  sources: {},
  layers: [],
};

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
    let diagnosisPayload = null;
    const recommendedFacility = {
      id: FACILITY_ID,
      facilityName: "Bệnh viện Tai Mũi Họng",
      address: "123 Nguyễn Trãi",
      rating: 4.7,
      latitude: 10.77,
      longitude: 106.69,
      isActive: true,
      departments: [{ departmentId: DEPARTMENT_ID, departmentName: "Tai Mũi Họng" }],
    };
    const secondaryFacility = {
      id: "99999999-9999-4999-8999-999999999999",
      facilityName: "Phòng khám Đánh Giá Cao",
      address: "456 Lê Lợi",
      rating: 5,
      latitude: 10.78,
      longitude: 106.7,
      isActive: true,
      departments: [{ departmentId: "other", departmentName: "Nội tổng quát" }],
    };

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
              recommendedFacilities: [recommendedFacility, secondaryFacility],
            },
          },
        }),
      });
    });

    await page.route("**/api/symptom-analysis/submit-diagnosis", async (route) => {
      diagnosisPayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: SESSION_ID,
            model: "google/medgemma-4b-it",
            diagnoses: [{
              rank: 1,
              diseaseName: "Viêm họng cấp",
              icd10Code: "J02",
              paGivenB: 0.86,
              clinicalReasoning: "Phù hợp với sốt nhẹ và đau họng.",
            }],
          },
        }),
      });
    });

    await page.route("**/api/medical-facilities/active", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [recommendedFacility, secondaryFacility] }),
    }));

    await page.route(`**/api/medical-facilities/${FACILITY_ID}`, (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: recommendedFacility }),
    }));

    await page.route("**/api/medical-departments**", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [{ id: DEPARTMENT_ID, departmentName: "Tai Mũi Họng" }] }),
    }));

    await page.route("**/api/facility-departments/active", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [{ facilityId: FACILITY_ID, departmentId: DEPARTMENT_ID }] }),
    }));

    await page.route("**/api/doctors**", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 12, totalCount: 0, totalPages: 0 } }),
    }));

    await page.route(`**/api/feedback-reviews/facility/${FACILITY_ID}**`, (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 } }),
    }));

    await page.route("https://basemaps.cartocdn.com/**", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(MAP_STYLE),
    }));

    await openRoute(page, "/dashboard");

    const symptoms = page.getByLabel("Triệu chứng bạn đang gặp");
    const submit = page.getByRole("button", { name: "Gợi ý chuyên khoa" });
    const currentStep = page.locator('[aria-current="step"]');

    await expect(page.getByRole("heading", { level: 2, name: "Gợi ý chuyên khoa qua triệu chứng" })).toBeVisible();
    await expect(currentStep).toContainText("Mô tả");
    await expect(symptoms).toHaveAttribute(
      "aria-describedby",
      /specialty-symptoms-hint/,
    );
    await expect(submit).toBeDisabled();
    await expect(page.getByText("Khi nào cần cấp cứu?")).toBeVisible();

    await symptoms.fill("Sốt nhẹ 2 ngày kèm đau họng");
    await expect(symptoms).toHaveValue("Sốt nhẹ 2 ngày kèm đau họng");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator(".studio-diagnosis-panel")).toBeFocused();
    await expect(currentStep).toContainText("Làm rõ");
    await expect(page.getByText("Bạn có sốt trên 38 độ không?")).toBeVisible();

    await page.getByLabel("Có").check();
    await page.getByRole("button", { name: "Xem nhận định và bệnh viện phù hợp" }).click();

    await expect(page.getByText("Viêm họng cấp", { exact: true }).first()).toBeVisible();
    await expect(currentStep).toContainText("Kết quả");
    await expect(page.getByText("Tai Mũi Họng", { exact: true })).toBeVisible();
    await expect(page.getByText("Bệnh viện Tai Mũi Họng", { exact: true })).toBeVisible();
    await expect(page.getByText("Kết quả này không thay thế bác sĩ và cần được kiểm tra bởi chuyên gia y tế.")).toBeVisible();
    await expect(page.getByText("#1")).toBeVisible();
    await expect(page.getByText("Ưu tiên vì có chuyên khoa liên quan, có tọa độ sẵn sàng điều hướng, 4.7 sao đánh giá, đang hoạt động.")).toBeVisible();

    await page.getByRole("button", { name: "Mở bản đồ" }).click();
    await expect(page).toHaveURL(new RegExp(`/map\\?[^#]*facilityId=${FACILITY_ID}`));
    await expect(page.locator(".facility-detail-view").getByRole("heading", { name: "Bệnh viện Tai Mũi Họng", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Đang xem chi tiết" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(currentStep).toContainText("Kết quả");
    await expect(page.getByText("Viêm họng cấp", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Bệnh viện Tai Mũi Họng", { exact: true })).toBeVisible();

    expect(questionPayload).toEqual({ userInput: "Sốt nhẹ 2 ngày kèm đau họng" });
    expect(answerPayload).toEqual({
      sessionId: SESSION_ID,
      answers: [{ questionId: QUESTION_ID, answer: true }],
    });
    expect(diagnosisPayload).toEqual(answerPayload);
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

  test("offers recovery actions when no follow-up question is returned", async ({ page }) => {
    await page.route("**/api/symptom-analysis/suggest-clinical-questions", async (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          sessionId: SESSION_ID,
          questions: [],
        },
      }),
    }));

    await openRoute(page, "/dashboard");
    await page.getByLabel("Triệu chứng bạn đang gặp").fill("Đau không rõ vị trí");
    await page.getByRole("button", { name: "Gợi ý chuyên khoa" }).click();

    await expect(page.getByText("AI chưa có câu hỏi phù hợp")).toBeVisible();
    await expect(page.getByRole("button", { name: "Quay lại biểu mẫu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thử lại với mô tả hiện tại" })).toBeVisible();

    await page.getByRole("button", { name: "Quay lại biểu mẫu" }).click();
    await expect(page.getByText("AI chưa có câu hỏi phù hợp")).toBeHidden();
    await expect(page.getByLabel("Triệu chứng bạn đang gặp")).toHaveValue("Đau không rõ vị trí");
  });

  test("loads symptom prefill directly into specialty consultation", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("medimate.symptom.prefill", "Headache for three days with poor sleep");
    });

    await openRoute(page, "/dashboard");

    await expect(page.locator("#specialty-symptoms")).toHaveValue("Headache for three days with poor sleep");
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("shows a dismissible profile nudge without blocking diagnosis", async ({ page }) => {
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
        isProfileCompleted: false,
      }));
    }, ACCESS_TOKEN);

    await openRoute(page, "/dashboard");

    await expect(page.getByRole("heading", { name: "Hoàn thiện hồ sơ khi bạn sẵn sàng" })).toBeVisible();
    await expect(page.getByLabel("Triệu chứng bạn đang gặp")).toBeVisible();

    await page.getByRole("button", { name: "Để sau" }).click();
    await expect(page.getByRole("heading", { name: "Hoàn thiện hồ sơ khi bạn sẵn sàng" })).toBeHidden();
    await expect(page.getByLabel("Triệu chứng bạn đang gặp")).toBeVisible();
  });
});
