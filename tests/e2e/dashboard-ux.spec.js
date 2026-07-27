import AxeBuilder from "@axe-core/playwright";
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

  test("keeps the clinical intake accessible at narrow widths", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await openRoute(page, "/dashboard");

    const symptoms = page.locator("#specialty-symptoms");
    await expect(symptoms).toBeVisible();
    await expect(page.getByText("Khi nào cần cấp cứu?")).toBeVisible();

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const seriousViolations = accessibility.violations
      .filter((violation) => ["critical", "serious"].includes(violation.impact))
      .map((violation) => violation.id);

    expect(seriousViolations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await symptoms.focus();
    await expect(symptoms).toBeFocused();
    await expect(symptoms).toHaveCSS("outline-width", "3px");

    await page.emulateMedia({ forcedColors: "active" });
    await expect(symptoms).toHaveCSS("outline-width", "3px");
  });

  test("asks follow-up questions and recommends a matching hospital in place", async ({ page }) => {
    let questionPayload = null;
    let diagnosisPayload = null;
    let consultationPayload = null;
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

    await page.route("**/api/symptom-analysis/submit-diagnosis", async (route) => {
      diagnosisPayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: SESSION_ID,
            model: "google/medgemma-4b-it",
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
                icd10Code: "J02",
                paGivenB: 0.86,
                clinicalReasoning: "Phù hợp với sốt nhẹ và đau họng.",
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

    await page.route(`**/api/symptom-analysis/${SESSION_ID}`, async (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          sessionId: SESSION_ID,
          medGemmaPrompt: "Dữ liệu nội bộ không được hiển thị",
          analysis: {
            primaryDiagnosis: {
              rank: 1,
              diseaseName: "Viêm họng cấp",
              icd10Code: "J02",
              paGivenB: 0.86,
              clinicalReasoning: "Phù hợp với sốt nhẹ và đau họng.",
            },
            recommendedDepartment: {
              departmentId: DEPARTMENT_ID,
              departmentName: "Tai Mũi Họng",
              confidenceScore: 0.86,
              isEmergencySuggested: false,
            },
            recommendedFacilities: [
              {
                id: FACILITY_ID,
                facilityName: recommendedFacility.facilityName,
                address: recommendedFacility.address,
                latitude: recommendedFacility.latitude,
                longitude: recommendedFacility.longitude,
                facilityType: "hospital",
                isActive: true,
                departments: [{
                  departmentId: DEPARTMENT_ID,
                  departmentName: "Tai Mũi Họng",
                }],
              },
            ],
          },
        },
      }),
    }));

    await page.route("**/api/medical-facilities/active", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [secondaryFacility] }),
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

    await page.route("**/api/consultation-sessions/generate-questions-for-consultant-session", async (route) => {
      consultationPayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            questions: [{ questionVi: "Bạn muốn hỏi bác sĩ điều gì?" }],
          },
        }),
      });
    });

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
    const submit = page.getByRole("button", { name: "Gửi triệu chứng", exact: true });
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

    await page.getByRole("button", { name: "Có" }).click();
    await page.getByRole("button", { name: "Xem gợi ý" }).click();

    await expect(page).toHaveURL(new RegExp(`/map\\?[^#]*source=clinical`));
    const mapUrl = new URL(page.url());
    expect(mapUrl.searchParams.get("sessionId")).toBe(SESSION_ID);
    expect(mapUrl.searchParams.get("facilityId")).toBe(FACILITY_ID);
    expect(mapUrl.searchParams.get("departmentId")).toBe(DEPARTMENT_ID);
    expect(mapUrl.searchParams.has("search")).toBe(false);

    await expect(page.getByLabel("Lọc danh sách cơ sở y tế")).toHaveValue("");
    await expect(page.getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" })).toContainText("Bệnh viện Tai Mũi Họng");
    await expect(page.getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" })).toContainText("Viêm họng cấp");
    await expect(page.getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" })).toContainText("ICD-10: J02");
    await expect(page.getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" })).toContainText("Tai Mũi Họng");
    await expect(page.getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" })).toContainText("Chuyên khoa được gợi ý");
    await expect(page.locator(".facility-result-card")).toHaveCount(1);
    await expect(page.locator(".clinic-marker")).toHaveCount(1);
    await expect(page.getByText("Phòng khám Đánh Giá Cao", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Dữ liệu nội bộ không được hiển thị")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mở AI hỗ trợ trước khám" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Xem chi tiết Bệnh viện Tai Mũi Họng/ })).toBeVisible();

    await page.getByRole("button", { name: "Mở AI hỗ trợ trước khám" }).click();
    await expect(page.getByRole("complementary", { name: "AI hỗ trợ trước khám" })).toBeVisible();
    await page.getByLabel("Triệu chứng của bạn").fill("Đau họng và sốt nhẹ");
    await page.getByRole("button", { name: "Tạo gợi ý câu hỏi" }).click();
    await expect(page.getByText("Bạn muốn hỏi bác sĩ điều gì?")).toBeVisible();
    expect(consultationPayload).toEqual({
      departmentId: DEPARTMENT_ID,
      symptoms: "Đau họng và sốt nhẹ",
    });

    await page.getByRole("button", { name: "Đóng AI hỗ trợ" }).click();
    await page
      .getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" })
      .getByRole("button", { name: "Xem chi tiết" })
      .click();
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page.locator(".facility-detail-sidebar")).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/tab=overview/);
    await expect(page.locator(".facility-detail-sidebar")).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Kết quả gợi ý chuyên khoa" })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/tab=overview/);
    await expect(page.locator(".facility-detail-sidebar")).toBeVisible();
    await page.goBack();

    await page.locator(".map-page-actions").getByRole("button", { name: "Trang chủ" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(currentStep).toContainText("Kết quả");
    await expect(page.getByText("Viêm họng cấp", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Bệnh viện Tai Mũi Họng", { exact: true })).toBeVisible();

    expect(questionPayload).toEqual({ userInput: "Sốt nhẹ 2 ngày kèm đau họng" });
    expect(diagnosisPayload).toEqual({
      sessionId: SESSION_ID,
      answers: [{ questionId: QUESTION_ID, answers: { yes: true, no: false } }],
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
    await page.getByRole("button", { name: "Gửi triệu chứng", exact: true }).click();

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
    await page.getByRole("button", { name: "Gửi triệu chứng", exact: true }).click();

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

  test("opens every specialty history page in a sidebar without navigating", async ({ page }) => {
    const requestedPages = [];
    const historySessions = [
      {
        sessionId: "44444444-4444-4444-8444-444444444444",
        inputText: "Đau họng và sốt nhẹ",
        sessionType: "department",
        status: "completed",
        createdAt: "2026-07-22T02:00:00Z",
      },
      {
        sessionId: "55555555-5555-4555-8555-555555555555",
        inputText: "Đau đầu kéo dài",
        sessionType: "department",
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

    await openRoute(page, "/dashboard");
    const initialUrl = page.url();
    const historyTrigger = page.getByRole("button", { name: "Lịch sử gợi ý chuyên khoa" });

    await historyTrigger.click();

    const drawer = page.getByRole("dialog", { name: "Lịch sử gợi ý chuyên khoa" });
    await expect(page).toHaveURL(initialUrl);
    await expect(historyTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Đau họng và sốt nhẹ", { exact: true })).toBeVisible();
    await expect(drawer.getByText("Đau đầu kéo dài", { exact: true })).toBeVisible();
    expect(requestedPages).toEqual([
      { pageNumber: 1, sessionType: "department" },
      { pageNumber: 2, sessionType: "department" },
    ]);

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(historyTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(historyTrigger).toBeFocused();
    await expect(page).toHaveURL(initialUrl);
  });
});
