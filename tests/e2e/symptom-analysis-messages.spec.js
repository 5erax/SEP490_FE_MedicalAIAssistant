import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiaXNQcmVtaXVtIjp0cnVlfQ",
  "",
].join(".");

const SERVICE_ERRORS = [
  "Nội dung triệu chứng là bắt buộc",
  "Nội dung triệu chứng không được vượt quá 2000 ký tự",
  "Request body là bắt buộc",
  "Id phiên phân tích triệu chứng là bắt buộc",
  "Không tìm thấy phiên phân tích triệu chứng",
  "Nội dung triệu chứng của phiên không tồn tại",
  "Không tìm thấy câu hỏi lâm sàng cho phiên này",
  "Không thể phân tích phản hồi JSON từ MedGemma",
];

test("symptom analysis uses exact service errors and validates the intake", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
      isPremium: true,
    }));
  }, ACCESS_TOKEN);

  await page.route("**/api/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));
  await page.route("**/api/symptom-analysis/suggest-clinical-questions", (route) => route.fulfill({
    status: 502,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      message: "Không thể xử lý yêu cầu phân tích triệu chứng",
      errors: [
        "Không thể phân tích phản hồi JSON từ MedGemma",
        "Lỗi không được ưu tiên",
      ],
    }),
  }));

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });

  const serviceResult = await page.evaluate(async (serviceErrors) => {
    const {
      getSymptomAnalysisApiMessage,
      getSymptomInputError,
    } = await import("/src/services/symptomAnalysisService.js");

    return {
      messages: serviceErrors.map((message) => getSymptomAnalysisApiMessage({
        status: 400,
        payload: {
          message: "Yêu cầu phân tích triệu chứng thất bại",
          errors: [message, "Lỗi phía sau"],
        },
      }, "Fallback")),
      validation: {
        empty: getSymptomInputError("   "),
        tooLong: getSymptomInputError("a".repeat(2001)),
        maximum: getSymptomInputError("a".repeat(2000)),
      },
      fallback: getSymptomAnalysisApiMessage({
        status: 400,
        payload: { errors: [] },
      }, "Fallback"),
    };
  }, SERVICE_ERRORS);

  expect(serviceResult.messages).toEqual(SERVICE_ERRORS);
  expect(serviceResult.validation).toEqual({
    empty: "Nội dung triệu chứng là bắt buộc",
    tooLong: "Nội dung triệu chứng không được vượt quá 2000 ký tự",
    maximum: "",
  });
  expect(serviceResult.fallback).toBe("Fallback");

  const textarea = page.locator("#clinical-user-input");
  const submit = page.getByRole("button", { name: "Tiếp tục phân tích lâm sàng" });

  await submit.click();
  await expect(page.getByText("Nội dung triệu chứng là bắt buộc", { exact: true })).toBeVisible();
  await expect(textarea).toHaveAttribute("aria-invalid", "true");
  await expect(textarea).toHaveAttribute("aria-describedby", /clinical-user-input-error/);

  await textarea.fill("a".repeat(2001));
  await submit.click();
  await expect(page.getByText("Nội dung triệu chứng không được vượt quá 2000 ký tự", { exact: true })).toBeVisible();

  await textarea.fill("Đau ngực khi gắng sức");
  await expect(textarea).not.toHaveAttribute("aria-invalid", "true");
  await submit.click();
  await expect(page.getByText("Không thể phân tích phản hồi JSON từ MedGemma", { exact: true })).toBeVisible();
  await expect(page.getByText("AI tạm thời không phản hồi", { exact: false })).toHaveCount(0);
});
