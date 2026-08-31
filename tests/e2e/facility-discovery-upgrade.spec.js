import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { Buffer } from "node:buffer";
import { preparePage } from "./helpers.js";

const FACILITY_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID = "22222222-2222-4222-8222-222222222222";
const DEPARTMENT_ID = "33333333-3333-4333-8333-333333333333";
const SESSION_ID = "55555555-5555-4555-8555-555555555555";
const TOKEN = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50In0.";
const OLD_PHOTO = "https://images.example.test/old.png";
const imageFile = (name = "photo.png") => ({ name, mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN0sAAAAASUVORK5CYII=", "base64") });

async function setup(page, options = {}) {
  await preparePage(page);
  const facilities = Array.from({ length: options.count || 1 }, (_, index) => ({
    id: index ? `11111111-1111-4111-8111-${String(index).padStart(12, "0")}` : FACILITY_ID,
    facilityName: `Cơ sở kiểm thử ${index + 1}`, address: "Địa chỉ thử nghiệm, TP.HCM",
    latitude: 10.8 + index * .015, longitude: 106.7 + index * .02,
    facilityType: "Hospital", isActive: true, averageRating: 5, reviewCount: 1,
    departments: [{ departmentId: DEPARTMENT_ID, departmentName: "Khoa Hô hấp" }],
    ...(options.outlier && index === 22 ? { latitude: 20, longitude: 110 } : {}),
  }));
  const snapshot = {
    sessionId: SESSION_ID,
    recommendedDepartment: { departmentId: DEPARTMENT_ID, departmentName: "Khoa Hô hấp", reason: "cúm", description: "Thông tin chuyên khoa để tham khảo." },
    diagnoses: [
      { diseaseName: "Kết quả A", pAGivenB: .6, rank: 1, clinicalReasoning: "Giải thích A không phải căn cứ chuyên khoa trong fixture." },
      { diseaseName: "cúm", pAGivenB: .35, rank: 2, clinicalReasoning: "Giải thích đúng nguồn B, dùng riêng để kiểm thử." },
    ],
    recommendedFacilities: facilities,
  };
  let review = { id: REVIEW_ID, userId: "audit-user", facilityId: FACILITY_ID, rating: 5,
    comment: "Nhận xét thử nghiệm ban đầu", imageUrls: options.imageUrls ?? { originalPhoto: OLD_PHOTO }, isCurrentUser: true };
  const updates = [];
  const uploadNames = [];
  const analysisRequests = [];
  await page.addInitScript(({ token, snapshot }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken: token, userId: "audit-user", displayName: "Người kiểm thử", roles: ["Patient"] }));
    sessionStorage.setItem("medimate.clinical-map.recommendation", JSON.stringify(snapshot));
    window.__MEDIMATE_CLOUDINARY_CONFIG__ = { cloudName: "audit-only", uploadPreset: "audit-only" };
  }, { token: TOKEN, snapshot });
  await page.route("https://basemaps.cartocdn.com/**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ version: 8, sources: {}, layers: [] }) }));
  await page.route("https://images.example.test/**", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="4000"><rect width="100%" height="100%" fill="#cde6de"/></svg>' }));
  await page.route("https://api.cloudinary.com/**", async (route) => {
    const body = route.request().postDataBuffer()?.toString() || "";
    const name = body.match(/filename="([^"]+)"/)?.[1] || "photo.png";
    uploadNames.push(name);
    if (options.upload) return options.upload(route, name, uploadNames);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ secure_url: `https://images.example.test/${name}`, public_id: `audit/${name}` }) });
  });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const json = (data) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data }) });
    if (url.pathname.startsWith("/api/symptom-analysis/")) { analysisRequests.push(route.request().method()); return json(snapshot); }
    if (url.pathname === "/api/medical-departments") return json([{ id: DEPARTMENT_ID, departmentName: "Khoa Hô hấp" }]);
    if (url.pathname === "/api/medical-facilities/active") return json(facilities);
    if (url.pathname.startsWith("/api/medical-facilities/")) return json(facilities.find((item) => url.pathname.endsWith(item.id)) || facilities[0]);
    if (url.pathname.startsWith("/api/feedback-reviews/facility/")) return json({ items: [review], totalCount: 1, pageNumber: 1, pageSize: 20, totalPages: 1 });
    if (url.pathname === `/api/feedback-reviews/${REVIEW_ID}` && route.request().method() === "PUT") {
      const values = route.request().postDataJSON();
      updates.push(values);
      if (options.saveError) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, message: "Chưa thể lưu. Vui lòng thử lại." }) });
      const images = { ...review.imageUrls };
      for (const [key, value] of Object.entries(values.imageUrls || {})) {
        if (value === null) delete images[key]; else images[key] = value;
      }
      review = { ...review, rating: values.rating ?? review.rating, comment: values.comment === null ? review.comment : values.comment, imageUrls: images };
      return json(review);
    }
    return json([]);
  });
  await page.goto(`/map?source=clinical&sessionId=${SESSION_ID}`);
  return { facilities, updates, uploadNames, analysisRequests, getReview: () => review };
}

async function browse(page) {
  await page.getByRole("button", { name: "Xem cơ sở mà không dùng vị trí", exact: true }).click();
}
async function editReview(page) {
  await browse(page);
  await page.getByRole("button", { name: "Xem chi tiết Cơ sở kiểm thử 1", exact: true }).click();
  await page.getByRole("tab", { name: "Đánh giá", exact: true }).click();
  await page.getByRole("button", { name: "Chỉnh sửa đánh giá", exact: true }).click();
}
async function chooseImages(page, files) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.locator(".review-upload-button").click();
  const chooser = await chooserPromise;
  await chooser.setFiles(files);
}

for (const width of [1920, 390, 320]) {
  test(`file chooser keeps the editor and save actions in the viewport at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1920 ? 918 : 740 });
    const fixture = await setup(page);
    await editReview(page);
    const save = page.getByRole("button", { name: "Lưu thay đổi", exact: true });
    await expect(page.getByRole("link", { name: "Tiếp tục tư vấn trước khám" })).toHaveCount(0);
    await chooseImages(page, imageFile());
    await expect(page.locator(".review-image-preview")).toHaveCount(2);
    await expect(save).toBeEnabled();
    await expect(save).toBeInViewport({ ratio: 1 });
    const geometry = await page.locator(".clinic-sidebar").evaluate((node) => ({ scrollTop: node.scrollTop, overflow: node.scrollHeight - node.clientHeight }));
    expect(geometry.scrollTop).toBe(0);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(await page.locator(".explorer-scroll").evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(false);
    const a11y = await new AxeBuilder({ page }).include(".clinic-sidebar").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(a11y.violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`review-editor-${width}.png`) });
    await save.click();
    await expect(page.getByRole("button", { name: "Chỉnh sửa đánh giá", exact: true })).toBeVisible();
    expect(fixture.updates).toHaveLength(1);
    expect(fixture.updates[0].imageUrls.originalPhoto).toBeUndefined();
    expect(Object.keys(fixture.getReview().imageUrls)).toHaveLength(2);
  });
}

test("23 results paginate completely and restore page, scroll and advice context", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 740 });
  const fixture = await setup(page, { count: 23 });
  await browse(page);
  const names = [];
  for (let currentPage = 1; currentPage <= 5; currentPage += 1) {
    await expect(page.locator(".facility-result-card")).toHaveCount(currentPage === 5 ? 3 : 5);
    names.push(...await page.locator(".facility-result-card .facility-top strong").allTextContents());
    if (currentPage < 5) await page.getByRole("navigation", { name: "Chuyển trang đầu danh sách", exact: true }).getByRole("button", { name: "Trang sau", exact: true }).click();
  }
  expect(new Set(names).size).toBe(23);
  await expect(page.getByText("21–23 trong 23 cơ sở", { exact: true })).toBeVisible();
  const last = page.getByRole("button", { name: "Xem chi tiết Cơ sở kiểm thử 23", exact: true });
  await last.scrollIntoViewIfNeeded();
  const scroll = await page.locator(".explorer-scroll").evaluate((node) => node.scrollTop);
  await expect(page.getByRole("button", { name: "Kết quả gợi ý", exact: true })).toBeInViewport({ ratio: 1 });
  await last.click();
  await page.getByRole("button", { name: "Quay lại danh sách", exact: true }).click();
  await expect(page.getByText("21–23 trong 23 cơ sở", { exact: true })).toBeVisible();
  expect(await page.locator(".explorer-scroll").evaluate((node) => node.scrollTop)).toBeCloseTo(scroll, -1);
  await page.getByRole("button", { name: "Kết quả gợi ý", exact: true }).click();
  await browse(page);
  await expect(page.getByText("21–23 trong 23 cơ sở", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Về đầu danh sách", exact: true }).click();
  await expect.poll(() => page.locator(".explorer-scroll").evaluate((node) => node.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "Về trang đầu", exact: true }).first().click();
  await expect(page.getByText("1–5 trong 23 cơ sở", { exact: true })).toBeVisible();
  expect(fixture.analysisRequests.every((method) => method === "GET")).toBe(true);
  await page.screenshot({ path: info.outputPath("paginated-list-mobile.png") });
});

test("reason comes from the related result and ranking is explained without disease probabilities", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await expect(page.locator(".explorer-reason-summary")).toContainText("cúm");
  await page.getByText("Vì sao gợi ý chuyên khoa này?", { exact: true }).click();
  await expect(page.locator(".explorer-source-reason")).toContainText("Giải thích đúng nguồn B");
  await expect(page.locator(".explorer-source-reason")).not.toContainText("Giải thích A");
  await page.locator(".explorer-reference-results > summary").click();
  await expect(page.locator(".explorer-score-explanation")).toContainText("không phải tỷ lệ triệu chứng trùng khớp hay xác suất mắc bệnh");
  await expect(page.locator(".explorer-diagnosis summary")).not.toContainText(["35%", "60%"]);
  await page.locator(".explorer-diagnosis").filter({ hasText: "cúm" }).locator("summary").click();
  await expect(page.getByText(/Điểm xếp hạng tham khảo của AI: 35\/100/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("clinical-explanation-mobile.png") });
});

test("selecting a map marker on another page restores that facility's list page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page, { count: 23, outlier: true });
  await browse(page);
  await page.getByRole("button", { name: "Chọn Cơ sở kiểm thử 23 trên bản đồ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cơ sở kiểm thử 23", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Quay lại danh sách", exact: true }).click();
  await expect(page.getByText("21–23 trong 23 cơ sở", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem chi tiết Cơ sở kiểm thử 23", exact: true })).toBeFocused();
});

test("replacing a photo when the review already has five keeps all other keys", async ({ page }) => {
  const existing = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`existing-${n}`, `https://images.example.test/${n}.png`]));
  const fixture = await setup(page, { imageUrls: existing });
  await editReview(page);
  await expect(page.getByLabel("Thêm ảnh minh họa", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Xóa ảnh 3", exact: true }).click();
  await chooseImages(page, imageFile("replacement.png"));
  const save = page.getByRole("button", { name: "Lưu thay đổi", exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByRole("button", { name: "Chỉnh sửa đánh giá", exact: true })).toBeVisible();
  expect(fixture.updates[0].imageUrls["existing-3"]).toBeNull();
  expect(Object.keys(fixture.getReview().imageUrls)).toHaveLength(5);
  for (const n of [1, 2, 4, 5]) expect(fixture.getReview().imageUrls[`existing-${n}`]).toBe(existing[`existing-${n}`]);
});

test("removing every photo and clearing the comment persists across a reload", async ({ page }) => {
  const fixture = await setup(page);
  await editReview(page);
  await page.getByRole("button", { name: "Xóa ảnh 1", exact: true }).click();
  await page.getByRole("textbox", { name: "Chia sẻ trải nghiệm" }).fill("");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chỉnh sửa đánh giá", exact: true })).toBeVisible();
  expect(fixture.updates[0]).toMatchObject({ imageUrls: { originalPhoto: null }, comment: "" });
  await page.reload();
  await browse(page);
  await page.getByRole("button", { name: "Xem chi tiết Cơ sở kiểm thử 1", exact: true }).click();
  await page.getByRole("tab", { name: "Đánh giá", exact: true }).click();
  await expect(page.locator(".current-user-review .review-image")).toHaveCount(0);
  await expect(page.locator(".current-user-review")).toContainText("Bạn không để lại nhận xét");
});

test("one upload failure preserves successful files and retries only the failed file", async ({ page }) => {
  const fixture = await setup(page, { upload: async (route, name, names) => {
    if (name === "bad.png" && names.filter((item) => item === name).length === 1) {
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: "Sensitive provider diagnostic" } }) });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ secure_url: `https://images.example.test/${name}` }) });
  } });
  await editReview(page);
  await chooseImages(page, [imageFile("good.png"), imageFile("bad.png")]);
  await expect(page.locator(".review-image-preview")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeDisabled();
  await expect(page.locator(".review-image-upload")).not.toContainText("Sensitive provider diagnostic");
  await page.getByRole("button", { name: "Thử lại ảnh 3", exact: true }).click();
  await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeEnabled();
  expect(fixture.uploadNames.filter((name) => name === "good.png")).toHaveLength(1);
  expect(fixture.uploadNames.filter((name) => name === "bad.png")).toHaveLength(2);
});

test("cancelling a pending upload cannot attach a late photo to the next draft", async ({ page }) => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const fixture = await setup(page, { upload: async (route) => {
    await pending;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ secure_url: "https://images.example.test/late.png" }) }).catch(() => {});
  } });
  await editReview(page);
  await chooseImages(page, imageFile());
  await expect.poll(() => fixture.uploadNames.length).toBe(1);
  await page.getByRole("button", { name: "Hủy chỉnh sửa", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" });
  await dialog.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await page.getByRole("button", { name: "Chỉnh sửa đánh giá", exact: true }).click();
  release();
  await expect(page.locator(".review-image-preview")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect.poll(() => fixture.updates.length).toBe(1);
  expect(fixture.updates[0].imageUrls).toEqual({});
});

test("invalid upload batches are rejected before any file is sent", async ({ page }) => {
  const fixture = await setup(page);
  await editReview(page);
  await chooseImages(page, [imageFile("good.png"), { ...imageFile("large.png"), buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }]);
  await expect(page.locator(".review-upload-status")).toContainText("5 MB");
  expect(fixture.uploadNames).toHaveLength(0);
  await expect(page.locator(".review-image-preview")).toHaveCount(1);
});

test("unsaved review survives rejected navigation, including browser Back", async ({ page }) => {
  await setup(page);
  await editReview(page);
  const comment = page.getByRole("textbox", { name: "Chia sẻ trải nghiệm" });
  await comment.fill("Bản nháp chưa lưu");
  await page.getByRole("tab", { name: "Tổng quan", exact: true }).click();
  let dialog = page.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" });
  await dialog.getByRole("button", { name: "Tiếp tục chỉnh sửa", exact: true }).click();
  await expect(comment).toHaveValue("Bản nháp chưa lưu");
  await page.goBack();
  dialog = page.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" });
  await dialog.getByRole("button", { name: "Tiếp tục chỉnh sửa", exact: true }).click();
  await expect(comment).toHaveValue("Bản nháp chưa lưu");
  await expect(page).toHaveURL(/facilityId=/);
  await page.goBack();
  await page.getByRole("alertdialog").getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(page.locator(".facility-result-card")).toHaveCount(1);
  await expect(page.locator(".facility-review-form")).toHaveCount(0);
});

test("failed save keeps rating, comment and attachment draft", async ({ page }) => {
  const fixture = await setup(page, { saveError: true });
  await editReview(page);
  const comment = page.getByRole("textbox", { name: "Chia sẻ trải nghiệm" });
  await comment.fill("Nhận xét cần giữ khi lỗi mạng");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.locator(".review-message")).toContainText("Chưa thể lưu");
  await expect(comment).toHaveValue("Nhận xét cần giữ khi lỗi mạng");
  await expect(page.locator(".review-image-preview")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeEnabled();
  expect(fixture.updates).toHaveLength(1);
});

test("reopening the same facility restores reviews instead of leaving an endless loading form", async ({ page }) => {
  await setup(page);
  await editReview(page);
  await page.getByRole("button", { name: "Hủy chỉnh sửa", exact: true }).click();
  await page.getByRole("button", { name: "Quay lại danh sách", exact: true }).click();
  await page.getByRole("button", { name: "Xem chi tiết Cơ sở kiểm thử 1", exact: true }).click();
  await page.getByRole("tab", { name: "Đánh giá", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chỉnh sửa đánh giá", exact: true })).toBeVisible();
  await expect(page.locator(".current-user-review")).toContainText("Nhận xét thử nghiệm ban đầu");
});
