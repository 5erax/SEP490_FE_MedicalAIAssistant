import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { preparePage } from "./helpers";

const TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const DEPARTMENT_ID = "22222222-2222-4222-8222-222222222222";
const CHAPTER_ID = "66666666-6666-4666-8666-666666666666";

async function authenticate(page) {
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "admin@example.com",
      roles: ["Admin"],
    }));
  }, TOKEN);
}

test.skip("symptom analysis renders the legacy analyze response", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let analyzePayload = null;

  await page.route("**/api/symptom-analysis/suggest-clinical-questions", async (route) => {
    analyzePayload = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          sessionId: "33333333-3333-4333-8333-333333333333",
          recommendedDepartments: [{
            departmentId: DEPARTMENT_ID,
            departmentName: "Tim mạch",
            confidenceScore: 0.91,
            reason: "Phù hợp với triệu chứng mô tả.",
            priorityRank: 1,
            isEmergencySuggested: false,
          }],
          recommendedFacilities: [],
        },
      }),
    });
  });

  await page.goto("/symptom", { waitUntil: "domcontentloaded" });
  await page.locator("textarea").first().fill("Đau ngực nhẹ");
  await page.getByRole("button", { name: "Phân tích →" }).click();

  await expect(page.getByText("Tim mạch", { exact: true })).toBeVisible();
  await expect(page.getByText("91%", { exact: true })).toBeVisible();
  expect(analyzePayload).toEqual({
    message: "Đau ngực nhẹ Mức độ người dùng tự đánh giá: medium.",
    disclaimerShown: true,
  });
});

test("facility review submits the Swagger payload", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let reviewPayload = null;
  let reviewUpdatePayload = null;
  let cloudinaryUploadCount = 0;
  const uploadedImageUrls = [
    "https://res.cloudinary.com/demo/image/upload/v1/reviews/hospital-review-1.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/reviews/hospital-review-2.jpg",
  ];

  await page.route("https://api.cloudinary.com/**", async (route) => {
    const uploadedImageUrl = uploadedImageUrls[cloudinaryUploadCount] || uploadedImageUrls[0];
    cloudinaryUploadCount += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ secure_url: uploadedImageUrl, public_id: `reviews/hospital-review-${cloudinaryUploadCount}` }),
    });
  });

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === "/api/medical-facilities/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [{
            id: FACILITY_ID,
            facilityName: "Bệnh viện A",
            address: "123 Nguyễn Trãi",
            latitude: 10.77,
            longitude: 106.69,
            phone: "0123456789",
            facilityType: "Hospital",
            openingHours: "24/7",
            departments: [],
          }],
        }),
      });
    }

    if (url.pathname === `/api/feedback-reviews/facility/${FACILITY_ID}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [{
              id: "public-review-id",
              rating: 5,
              comment: "Nhân viên hỗ trợ tận tình",
              reviewerName: "Nguyễn Minh Anh",
              createdAt: "2026-07-10T08:00:00Z",
            }],
            pageNumber: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
          },
        }),
      });
    }

    if (url.pathname === "/api/feedback-reviews" && method === "POST") {
      reviewPayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã gửi đánh giá.", data: { id: "review-id" } }),
      });
    }

    if (url.pathname === "/api/feedback-reviews/review-id" && method === "PUT") {
      reviewUpdatePayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Đã cập nhật đánh giá.", data: { id: "review-id" } }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Bệnh viện A", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Xem chi tiết" }).click();
  await page.getByRole("tab", { name: "Đánh giá" }).click();
  await expect(page.getByText("Nguyễn Minh Anh", { exact: true })).toBeVisible();
  await page.getByTitle("5 sao · Rất hài lòng").hover();
  await expect(page.locator(".star-rating svg[fill='currentColor']")).toHaveCount(5);
  await page.getByRole("radio", { name: "4 sao" }).check();
  await page.getByLabel("Chia sẻ trải nghiệm").fill("Dịch vụ tốt");
  await page.getByLabel("Thêm ảnh (0/5)").setInputFiles({
    name: "not-an-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not-an-image"),
  });
  await expect(page.getByText("Cloudinary chỉ nhận file ảnh ở trường này.", { exact: true })).toBeVisible();
  await page.getByLabel("Thêm ảnh (0/5)").setInputFiles([
    { name: "hospital-review-1.png", mimeType: "image/png", buffer: Buffer.from("mock-review-image-1") },
    { name: "hospital-review-2.png", mimeType: "image/png", buffer: Buffer.from("mock-review-image-2") },
  ]);
  await expect(page.getByAltText("Ảnh minh họa 1 sẽ đính kèm đánh giá")).toHaveAttribute("src", uploadedImageUrls[0]);
  await expect(page.getByAltText("Ảnh minh họa 2 sẽ đính kèm đánh giá")).toHaveAttribute("src", uploadedImageUrls[1]);
  await page.getByRole("button", { name: "Gửi đánh giá" }).click();

  await expect(page.getByText("Đã gửi đánh giá.", { exact: true })).toBeVisible();
  await expect(page.getByText("Bạn đã đánh giá cơ sở này", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi đánh giá" })).toHaveCount(0);
  expect(reviewPayload).toEqual({
    facilityId: FACILITY_ID,
    rating: 4,
    comment: "Dịch vụ tốt",
    imageUrl: uploadedImageUrls[0],
    imageUrls: uploadedImageUrls,
  });
  expect(cloudinaryUploadCount).toBe(2);
  await expect(page.getByAltText("Ảnh 1 trong đánh giá của Bạn")).toHaveAttribute("src", uploadedImageUrls[0]);
  await expect(page.getByAltText("Ảnh 2 trong đánh giá của Bạn")).toHaveAttribute("src", uploadedImageUrls[1]);

  await page.getByRole("button", { name: "Chỉnh sửa đánh giá" }).click();
  await page.getByRole("radio", { name: "3 sao" }).check();
  await page.getByLabel("Chia sẻ trải nghiệm").fill("Dịch vụ đã được cải thiện");
  await page.getByRole("button", { name: "Lưu chỉnh sửa" }).click();
  await expect(page.getByText("Đã cập nhật đánh giá của bạn.", { exact: true })).toBeVisible();
  expect(reviewUpdatePayload).toEqual({
    rating: 3,
    comment: "Dịch vụ đã được cải thiện",
    imageUrl: uploadedImageUrls[0],
    imageUrls: uploadedImageUrls,
  });
});

test("admin creates a doctor invitation with an optional doctor link", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let invitationPayload = null;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (url.pathname === "/api/admin/doctor-invitations" && method === "POST") {
      invitationPayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Invitation sent.",
          data: {
            id: "44444444-4444-4444-8444-444444444444",
            email: "doctor@example.com",
            doctorId: null,
            status: "Pending",
          },
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(url.pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Bác sĩ", exact: true }).click();
  await page.getByLabel("Email bác sĩ").fill("doctor@example.com");
  await page.getByRole("button", { name: "Gửi invitation" }).click();

  await expect(page.getByText("Invitation sent.", { exact: true })).toBeVisible();
  expect(invitationPayload).toEqual({ email: "doctor@example.com" });
});

test("admin invitation displays backend error details with the generic summary", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }

    if (url.pathname === "/api/admin/doctor-invitations") {
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Create doctor invitation failed.",
          errors: ["The email already has an account."],
        }),
      });
    }

    const pagedPaths = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"];
    const data = pagedPaths.includes(url.pathname)
      ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 }
      : [];
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Bác sĩ", exact: true }).click();
  await page.getByLabel("Email bác sĩ").fill("new-doctor@example.com");
  await page.getByRole("button", { name: "Gửi invitation" }).click();

  await expect(page.getByText(
    "Create doctor invitation failed. The email already has an account.",
    { exact: true },
  )).toBeVisible();
});

test("profile page renders and updates backend user data instead of mock data", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let updatePayload = null;
  const USER_ID = "55555555-5555-4555-8555-555555555555";

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            identityId: USER_ID,
            displayName: "Nguyễn Minh Backend",
            email: "backend@example.com",
            phoneNumber: "0901234567",
            address: "Hà Nội",
            gender: 1,
            dateOfBirth: "1990-01-02",
          },
        }),
      });
    }

    if (url.pathname === `/api/users/${USER_ID}` && method === "PUT") {
      updatePayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Profile updated.", data: updatePayload }),
      });
    }

    if (url.pathname === "/api/patient-profiles") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 100, totalCount: 0, totalPages: 0 },
        }),
      });
    }

    if (url.pathname === "/api/user-subscriptions/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Nguyễn Minh Backend", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Thông tin cá nhân" }).first()).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Chỉnh sửa" }).click();
  await page.getByLabel("Họ và tên").fill("Nguyễn Minh Đã Sửa");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();

  await expect(page.getByText("Đã lưu thông tin!", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Thông tin cá nhân" }).first().press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Hồ sơ y tế" }).first()).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Dữ liệu sức khỏe nhạy cảm", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Chiều cao (cm)")).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobileWidth.scrollWidth).toBeLessThanOrEqual(mobileWidth.clientWidth);
  expect(updatePayload).toEqual({
    displayName: "Nguyễn Minh Đã Sửa",
    address: "Hà Nội",
    gender: 1,
    dateOfBirth: "1990-01-02",
    phoneNumber: "0901234567",
  });
});

test("clinical diagnosis uses the dedicated Swagger endpoint", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
    }));
  }, TOKEN);
  const sessionId = "33333333-3333-4333-8333-333333333333";
  const questionId = "77777777-7777-4777-8777-777777777777";
  let diagnosisPayload = null;

  await page.route("**/api/symptom-analysis/suggest-clinical-questions", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { sessionId, questions: [{ questionId, questionVi: "Bạn có sốt không?" }] } }),
  }));
  await page.route("**/api/symptom-analysis/submit-clinical-question-answers", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: { analysis: { recommendedDepartment: { departmentName: "Nội tổng quát", confidenceScore: 0.7 } } } }),
  }));
  await page.route("**/api/symptom-analysis/submit-diagnosis", (route) => {
    diagnosisPayload = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { diagnoses: [{ rank: 1, diseaseName: "Cúm", icd10Code: "J11", paGivenB: 0.7 }] } }),
    });
  });

  await page.goto("/dashboard");
  await page.getByLabel("Triệu chứng bạn đang gặp").fill("Ho và sốt");
  await page.getByRole("button", { name: "Gợi ý chuyên khoa" }).click();
  await page.getByRole("button", { name: "Có" }).click();
  await page.getByRole("button", { name: "Tiếp tục phân tích" }).click();

  await expect(page.getByText("Cúm", { exact: true })).toBeVisible();
  await expect(page.getByText("Nội tổng quát", { exact: true })).toBeVisible();
  expect(diagnosisPayload).toEqual({ sessionId, answers: [{ questionId, answers: { yes: true, no: false } }] });
});

test("chat sends the backend WebChatbotRequest and renders its answer", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let chatPayload = null;

  await page.route("**/api/web-chatbot/message", async (route) => {
    chatPayload = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { answer: "Phản hồi từ backend", recommendedPlans: [], intent: "health", needsMoreInformation: false },
      }),
    });
  });

  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Nhập triệu chứng hoặc câu hỏi...").fill("Tôi bị đau đầu");
  await page.getByRole("button", { name: "Gửi", exact: true }).click();

  await expect(page.getByText("Phản hồi từ backend", { exact: true })).toBeVisible();
  expect(chatPayload).toEqual({ message: "Tôi bị đau đầu" });
});

test("admin clinical question form sends the Swagger DTO", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let clinicalPayload = null;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { name: "Admin", roles: ["Admin"] } }) });
    }
    if (url.pathname === "/api/clinical-questions" && method === "POST") {
      clinicalPayload = route.request().postDataJSON();
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { id: "question-id", ...clinicalPayload } }) });
    }
    const paged = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities", "/api/clinical-questions", "/api/icd-chapters"].includes(url.pathname);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: paged ? { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 1 } : [] }) });
  });

  await page.goto("/app/admin/clinical-questions", { waitUntil: "domcontentloaded" });
  await page.getByLabel("ID chương ICD").fill(CHAPTER_ID);
  await page.getByLabel("Mã chương ICD").fill("A-B");
  await page.getByLabel("Câu hỏi tiếng Việt").fill("Bạn có sốt cao không?");
  await page.getByLabel("Câu hỏi tiếng Anh").fill("Do you have a high fever?");
  await page.getByLabel("Thứ tự").fill("2");
  await page.getByRole("button", { name: "Tạo mới", exact: true }).click();

  expect(clinicalPayload).toEqual({
    chapterId: CHAPTER_ID,
    chapterCode: "A-B",
    questionVi: "Bạn có sốt cao không?",
    englishPrefix: "Do you have a high fever?",
    sortOrder: 2,
  });
});

test("admin ICD form sends keywordWeights instead of unsupported description", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let icdPayload = null;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { name: "Admin", roles: ["Admin"] } }) });
    }
    if (url.pathname === "/api/icd-chapters" && method === "POST") {
      icdPayload = route.request().postDataJSON();
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { id: CHAPTER_ID, ...icdPayload } }) });
    }
    const paged = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities", "/api/icd-chapters"].includes(url.pathname);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: paged ? { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 1 } : [] }) });
  });

  await page.goto("/app/admin/icd-chapters", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Tạo ICD" }).click();
  await page.getByLabel("Mã Chapter").fill("A-B");
  await page.getByLabel("Tên Chapter").fill("Bệnh truyền nhiễm");
  await page.getByLabel("Danh sách từ khóa").fill('{"sốt":5,"ho":3}');
  await page.getByRole("button", { name: "Tạo ICD Chapter", exact: true }).click();

  expect(icdPayload).toEqual({ chapterCode: "A-B", chapterName: "Bệnh truyền nhiễm", keywordWeights: { sốt: 5, ho: 3 } });
});

test("admin can update the ICD chapter code", async ({ page }) => {
  await preparePage(page);
  await authenticate(page);
  let updatePayload = null;

  const chapter = {
    id: CHAPTER_ID,
    chapterCode: "A-B",
    chapterName: "Bệnh truyền nhiễm",
    keywordWeights: { sốt: 5 },
  };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { name: "Admin", roles: ["Admin"] } }) });
    }
    if (url.pathname === "/api/icd-chapters" && method === "GET") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: [chapter], pageNumber: 1, pageSize: 20, totalCount: 1, totalPages: 1 } }),
      });
    }
    if (url.pathname === `/api/icd-chapters/${CHAPTER_ID}` && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: chapter }) });
    }
    if (url.pathname === `/api/icd-chapters/${CHAPTER_ID}` && method === "PUT") {
      updatePayload = route.request().postDataJSON();
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { ...chapter, ...updatePayload } }) });
    }
    const paged = ["/api/users", "/api/doctors", "/api/ai-configs", "/api/medical-facilities"].includes(url.pathname);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: paged ? { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 1 } : [] }) });
  });

  await page.goto("/app/admin/icd-chapters", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sửa" }).click();
  const chapterCodeField = page.getByLabel("Mã Chapter");
  await expect(chapterCodeField).toBeEditable();
  await chapterCodeField.fill("A-C");
  await page.getByLabel("Tên Chapter").fill("Bệnh truyền nhiễm cập nhật");
  await page.getByRole("button", { name: "Lưu cập nhật" }).click();

  expect(updatePayload).toEqual({
    chapterCode: "A-C",
    chapterName: "Bệnh truyền nhiễm cập nhật",
    keywordWeights: { sốt: 5 },
  });
});
