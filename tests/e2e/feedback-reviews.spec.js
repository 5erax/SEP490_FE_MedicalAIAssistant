import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50Iiwic3ViIjoicGF0aWVudC0xIn0",
  "",
].join(".");
const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_REVIEW_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_REVIEW_ID = "33333333-3333-4333-8333-333333333333";

const SERVICE_ERRORS = [
  "Request body là bắt buộc",
  "FacilityId là bắt buộc",
  "Rating phải từ 1 đến 5",
  "Comment không được vượt quá 1000 ký tự.",
  "Người dùng chưa đăng nhập",
  "Không tìm thấy cơ sở y tế",
  "Cơ sở y tế không hoạt động",
  "Bạn đã đánh giá cơ sở y tế này",
  "Id feedback không hợp lệ",
  "Không tìm thấy feedback",
  "Status không hợp lệ",
  "ImageUrls chứa key rỗng",
  "Key ImageUrls không được vượt quá 100 ký tự",
  "ImageUrls chứa key trùng lặp",
  "ImageUrls chứa URL rỗng",
  "ImageUrls không được chứa quá 5 ảnh",
  "ImageUrl không được vượt quá 2048 ký tự",
  "ImageUrl không hợp lệ",
];

test("feedback review prioritizes errors and uses exact controller fallbacks", async ({ page }) => {
  await preparePage(page);
  await page.route("**/api/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ success: true, data: [] }),
  }));
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const result = await page.evaluate(async (serviceErrors) => {
    const {
      FEEDBACK_REVIEW_MESSAGES: messages,
      getFeedbackReviewApiMessage: getMessage,
    } = await import("/src/services/feedbackReviewService.js");

    return {
      serviceErrors: serviceErrors.map((message) => getMessage({
        status: 400,
        payload: { message: "Tạo feedback thất bại", errors: [message, "Lỗi phía sau"] },
      }, messages.create.failure)),
      fallbacks: {
        create: getMessage({ status: 400, payload: { errors: [] } }, messages.create.failure),
        update: getMessage({ status: 400, payload: { errors: [] } }, messages.update.failure),
        status: getMessage({ status: 400, payload: { errors: [] } }, messages.status.failure),
        delete: getMessage({ status: 400, payload: { errors: [] } }, messages.delete.failure),
        facility: getMessage({ status: 400, payload: { errors: [] } }, messages.facility.invalidId),
        detailInvalid: getMessage({ status: 400, payload: { errors: [] } }, messages.detail.invalidId),
        detailMissing: getMessage({ status: 404, payload: { errors: [] } }, messages.detail.notFound),
        listFacility: getMessage({ status: 400, payload: { errors: [] } }, messages.list.invalidFacilityId),
        listUser: getMessage({ status: 400, payload: { errors: [] } }, messages.list.invalidUserId),
        listRating: getMessage({ status: 400, payload: { errors: [] } }, messages.list.invalidRating),
      },
      controllerRatingError: getMessage({
        status: 400,
        payload: {
          message: messages.list.invalidRating,
          errors: [messages.list.ratingError],
        },
      }, messages.list.invalidRating),
      authController: getMessage({
        status: 401,
        payload: { errors: [messages.auth.required] },
      }, messages.auth.fallback),
      authFallback: getMessage({
        status: 401,
        payload: { message: "Unauthorized.", errors: [] },
      }, messages.auth.fallback),
      success: {
        list: getMessage({}, messages.list.success),
        facility: getMessage({}, messages.facility.success),
        detail: getMessage({}, messages.detail.success),
        create: getMessage({}, messages.create.success),
        update: getMessage({}, messages.update.success),
        status: getMessage({}, messages.status.success),
        delete: getMessage({}, messages.delete.success),
      },
    };
  }, SERVICE_ERRORS);

  expect(result.serviceErrors).toEqual(SERVICE_ERRORS);
  expect(result.controllerRatingError).toBe("Bộ lọc rating phải từ 1 đến 5");
  expect(result.authController).toBe("Người dùng chưa đăng nhập");
  expect(result.authFallback).toBe("Chưa đăng nhập");
  expect(result.fallbacks).toEqual({
    create: "Tạo feedback thất bại",
    update: "Cập nhật feedback thất bại",
    status: "Cập nhật trạng thái feedback thất bại",
    delete: "Xóa feedback thất bại",
    facility: "Id cơ sở y tế không hợp lệ",
    detailInvalid: "Id feedback không hợp lệ",
    detailMissing: "Không tìm thấy feedback",
    listFacility: "Id cơ sở y tế không hợp lệ",
    listUser: "Id người dùng không hợp lệ",
    listRating: "Bộ lọc rating không hợp lệ",
  });
  expect(result.success).toEqual({
    list: "OK",
    facility: "OK",
    detail: "OK",
    create: "Tạo feedback thành công",
    update: "Cập nhật feedback thành công",
    status: "Cập nhật trạng thái feedback thành công",
    delete: "Xóa feedback thành công",
  });
});

test("facility review displays the first service error and create fallback", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      displayName: "Người bệnh thử nghiệm",
      roles: ["Patient"],
    }));
  }, TOKEN);
  // This test only cares about the review form, not the map itself, so force
  // the map into its error-fallback state where the facility list is always shown.
  await page.route("https://basemaps.cartocdn.com/**", (route) => route.abort("failed"));

  let createAttempt = 0;
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
            facilityName: "Bệnh viện kiểm thử",
            address: "123 Nguyễn Trãi",
            latitude: 10.77,
            longitude: 106.69,
            facilityType: "Hospital",
            isActive: true,
          }],
        }),
      });
    }

    if (url.pathname === `/api/feedback-reviews/facility/${FACILITY_ID}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OK",
          data: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
        }),
      });
    }

    if (url.pathname === "/api/feedback-reviews" && method === "POST") {
      createAttempt += 1;
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify(createAttempt === 1
          ? {
              success: false,
              message: "Tạo feedback thất bại",
              errors: ["ImageUrl không hợp lệ", "ImageUrls chứa URL rỗng"],
            }
          : { success: false, errors: [] }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Bệnh viện kiểm thử", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Xem chi tiết" }).click();
  await page.getByRole("tab", { name: "Đánh giá" }).click();

  const submit = page.getByRole("button", { name: "Gửi đánh giá" });
  await submit.click();
  await expect(page.getByText("ImageUrl không hợp lệ", { exact: true })).toBeVisible();
  await submit.click();
  await expect(page.getByText("Tạo feedback thất bại", { exact: true })).toBeVisible();
  expect(createAttempt).toBe(2);
});

test("a patient can confirm and delete only their own facility review", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      displayName: "Người bệnh thử nghiệm",
      roles: ["Patient"],
    }));
  }, { accessToken: TOKEN, userId: "patient-1" });
  await page.route("https://basemaps.cartocdn.com/**", (route) => route.abort("failed"));

  let deleteAttempt = 0;
  let reviewItems = [
    {
      id: OWNER_REVIEW_ID,
      userId: "patient-1",
      facilityId: FACILITY_ID,
      reviewerName: "Người bệnh thử nghiệm",
      rating: 5,
      comment: "Trải nghiệm của tôi",
      status: "Approved",
      createdAt: "2026-08-13T08:00:00Z",
    },
    {
      id: OTHER_REVIEW_ID,
      userId: "patient-2",
      facilityId: FACILITY_ID,
      reviewerName: "Người dùng khác",
      rating: 4,
      comment: "Nhận xét vẫn còn",
      status: "Approved",
      createdAt: "2026-08-12T08:00:00Z",
    },
  ];

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
            facilityName: "Bệnh viện kiểm thử",
            address: "123 Nguyễn Trãi",
            latitude: 10.77,
            longitude: 106.69,
            facilityType: "Hospital",
            isActive: true,
          }],
        }),
      });
    }

    if (url.pathname === `/api/feedback-reviews/facility/${FACILITY_ID}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "OK",
          data: {
            items: reviewItems,
            pageNumber: 1,
            pageSize: 20,
            totalCount: reviewItems.length,
            totalPages: 1,
          },
        }),
      });
    }

    if (url.pathname === `/api/feedback-reviews/${OWNER_REVIEW_ID}` && method === "DELETE") {
      deleteAttempt += 1;
      if (deleteAttempt === 1) {
        return route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Xóa feedback thất bại",
            errors: ["Bạn chỉ có thể xóa đánh giá của mình."],
          }),
        });
      }

      reviewItems = reviewItems.filter((review) => review.id !== OWNER_REVIEW_ID);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Xóa feedback thành công",
          errors: [],
        }),
      });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/map", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Bệnh viện kiểm thử", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Xem chi tiết" }).click();
  await page.getByRole("tab", { name: "Đánh giá" }).click();

  const deleteButton = page.getByRole("button", { name: "Xóa đánh giá", exact: true });
  await expect(deleteButton).toHaveCount(1);
  await expect(page.getByText("Trải nghiệm của tôi", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Nhận xét vẫn còn", { exact: true })).toBeVisible();
  await expect(page.getByText("2 đánh giá", { exact: true })).toBeVisible();

  await deleteButton.click();
  const dialog = page.getByRole("dialog", { name: "Xóa đánh giá?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(deleteAttempt).toBe(0);

  await deleteButton.click();
  await dialog.getByRole("button", { name: "Xóa đánh giá", exact: true }).click();
  await expect(page.getByText("Bạn chỉ có thể xóa đánh giá của mình.", { exact: true }).first()).toBeVisible();
  await expect(deleteButton).toBeEnabled();
  await expect(page.getByText("2 đánh giá", { exact: true })).toBeVisible();

  await deleteButton.click();
  await dialog.getByRole("button", { name: "Xóa đánh giá", exact: true }).click();
  await expect(page.getByText("Xóa feedback thành công", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi đánh giá", exact: true })).toBeVisible();
  await expect(page.getByText("Trải nghiệm của tôi", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Nhận xét vẫn còn", { exact: true })).toBeVisible();
  await expect(page.getByText("1 đánh giá", { exact: true })).toBeVisible();
  expect(deleteAttempt).toBe(2);
});
