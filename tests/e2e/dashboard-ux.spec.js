import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

const USER_ID = "55555555-5555-4555-8555-555555555555";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const QUESTION_ID = "77777777-7777-4777-8777-777777777777";
const DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";

async function authenticatePatient(page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      identityId: userId,
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, userId: USER_ID });
}

async function routeCommonPatientApis(page) {
  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: USER_ID,
        displayName: "Nguyen Minh",
        email: "patient@example.com",
      },
    }),
  }));

  await page.route("**/api/user-subscriptions/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));
}

async function routeAssessmentApis(page) {
  let questionPayload = null;
  let answerPayload = null;
  let diagnosisPayload = null;

  await page.route("**/api/patient-profiles**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        items: [{
          id: "66666666-6666-4666-8666-666666666666",
          userId: USER_ID,
          bloodType: "O+",
          height: 170,
          weight: 65,
          allergyNote: "Di ung penicillin",
          chronicDiseaseNote: "Hen suyễn",
          isProfileCompleted: true,
        }],
      },
    }),
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
            questionVi: "Ban co sot tren 38 do khong?",
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
            recommendedDepartment: {
              departmentId: DEPARTMENT_ID,
              departmentName: "Tai Mui Hong",
              confidenceScore: 0.86,
              reason: "Nen kham chuyen khoa tai mui hong.",
            },
            recommendedFacilities: [],
          },
          answers: [{ questionId: QUESTION_ID, answer: true }],
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
            diseaseName: "Viem hong cap",
            icd10Code: "J02",
            paGivenB: 0.86,
            clinicalReasoning: "Phu hop voi sot nhe va dau hong.",
          }],
        },
      }),
    });
  });

  await page.route(`**/api/medical-facilities/active?departmentId=${DEPARTMENT_ID}`, (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [{
        id: "11111111-1111-4111-8111-111111111111",
        facilityName: "Benh vien Tai Mui Hong",
        address: "123 Nguyen Trai",
        latitude: 10.77,
        longitude: 106.69,
        phone: "0123456789",
        isActive: true,
        departments: [{ departmentId: DEPARTMENT_ID, departmentName: "Tai Mui Hong" }],
      }],
    }),
  }));

  return {
    get questionPayload() {
      return questionPayload;
    },
    get answerPayload() {
      return answerPayload;
    },
    get diagnosisPayload() {
      return diagnosisPayload;
    },
  };
}

test.describe("patient dashboard and assessment flow", () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page);
    await authenticatePatient(page);
    await routeCommonPatientApis(page);
  });

  test("dashboard is a patient hub backed by my-sessions", async ({ page }) => {
    await page.route("**/api/symptom-analysis/my-sessions**", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          items: [{
            sessionId: SESSION_ID,
            inputText: "Ho va dau hong",
            status: "completed",
            createdAt: "2026-06-20T08:00:00Z",
          }],
          pageNumber: 1,
          pageSize: 5,
          totalCount: 1,
          totalPages: 1,
        },
      }),
    }));

    await openRoute(page, "/dashboard");

    await expect(page.getByRole("heading", { level: 1, name: /Xin chao/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Danh gia trieu chung moi/ })).toBeVisible();
    await expect(page.getByText("Ho va dau hong", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xem chi tiet" })).toBeVisible();
  });

  test("intake preloads patient profile and completes assessment to result", async ({ page }) => {
    await page.route("**/api/symptom-analysis/my-sessions**", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [] } }),
    }));
    const payloads = await routeAssessmentApis(page);

    const profileResponse = page.waitForResponse(/\/api\/patient-profiles/);
    await openRoute(page, "/symptom");
    await profileResponse;

    await expect(page.getByLabel("Thong tin ho so suc khoe")).toHaveValue("Nhom mau O+, Chieu cao 170 cm, Can nang 65 kg");
    await expect(page.getByLabel("Benh nen")).toHaveValue("Hen suyễn");
    await expect(page.getByLabel("Di ung")).toHaveValue("Di ung penicillin");

    await page.getByLabel("Trieu chung chinh").fill("Sot nhe");
    await page.getByLabel("Mo ta them").fill("Sot nhe 2 ngay kem dau hong");
    await page.getByRole("button", { name: "Tao cau hoi lam sang" }).click();

    await expect(page).toHaveURL(new RegExp(`/assessment/${SESSION_ID}$`));
    await expect(page.getByText("Ban co sot tren 38 do khong?")).toBeVisible();
    await page.getByLabel("Co").check();
    await page.getByRole("button", { name: "Xem ket qua" }).click();

    await expect(page).toHaveURL(new RegExp(`/assessment/${SESSION_ID}/result$`));
    await expect(page.getByText("Tai Mui Hong", { exact: true })).toBeVisible();
    await expect(page.getByText("Viem hong cap", { exact: true })).toBeVisible();
    await expect(page.getByText("Benh vien Tai Mui Hong", { exact: true })).toBeVisible();

    expect(payloads.questionPayload.userInput).toContain("Trieu chung chinh: Sot nhe");
    expect(payloads.questionPayload.userInput).toContain("Thong tin ho so suc khoe: Nhom mau O+, Chieu cao 170 cm, Can nang 65 kg");
    expect(payloads.questionPayload.userInput).toContain("Benh nen: Hen suyễn");
    expect(payloads.questionPayload.userInput).toContain("Di ung: Di ung penicillin");
    expect(payloads.answerPayload).toEqual({
      sessionId: SESSION_ID,
      answers: [{ questionId: QUESTION_ID, answer: true }],
    });
    expect(payloads.diagnosisPayload).toEqual(payloads.answerPayload);
  });

  test("no-question response asks the user to supplement intake details", async ({ page }) => {
    await page.route("**/api/patient-profiles**", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [] } }),
    }));
    await page.route("**/api/symptom-analysis/suggest-clinical-questions", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { sessionId: SESSION_ID, questions: [] } }),
    }));

    await openRoute(page, "/symptom");
    await page.getByLabel("Trieu chung chinh").fill("Dau khong ro vi tri");
    await page.getByLabel("Mo ta them").fill("Mo ta ngan");
    await page.getByRole("button", { name: "Tao cau hoi lam sang" }).click();

    await expect(page).toHaveURL(new RegExp(`/assessment/${SESSION_ID}$`));
    await expect(page.getByText("Backend chua tao duoc cau hoi lam sang")).toBeVisible();
    await expect(page.getByRole("button", { name: "Quay lai bo sung thong tin" })).toBeVisible();
  });
});
