import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");
const USER_1 = "11111111-1111-4111-8111-111111111111";
const USER_2 = "22222222-2222-4222-8222-222222222222";
const PROFILE_1 = "33333333-3333-4333-8333-333333333333";
const PROFILE_2 = "44444444-4444-4444-8444-444444444444";

test("admin creates, updates and deletes patient profiles from Swagger contract", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({ accessToken, email: "admin@example.com", roles: ["Admin"] }));
  }, ADMIN_TOKEN);

  const users = [
    { id: USER_1, userId: USER_1, displayName: "Bệnh nhân hiện tại", email: "existing@example.com" },
    { id: USER_2, userId: USER_2, displayName: "Bệnh nhân mới", email: "new@example.com" },
  ];
  let profiles = [{
    id: PROFILE_1,
    userId: USER_1,
    bloodType: "A+",
    height: 168,
    weight: 60,
    allergyNote: "Dị ứng hải sản",
    chronicDiseases: [],
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: null,
    isDeleted: false,
    isProfileCompleted: true,
  }];
  let createPayload = null;
  let updatePayload = null;
  let deletedProfileId = "";

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === "/api/users/me") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }) });
    }
    if (url.pathname === "/api/users") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: users, pageNumber: 1, pageSize: 100, totalCount: users.length, totalPages: 1 } }) });
    }
    if (url.pathname === "/api/patient-profiles" && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: { items: profiles, pageNumber: 1, pageSize: 10, totalCount: profiles.length, totalPages: 1 } }) });
    }
    if (url.pathname === "/api/patient-profiles" && method === "POST") {
      createPayload = route.request().postDataJSON();
      const created = { id: PROFILE_2, ...createPayload, createdAt: "2026-07-12T00:00:00Z", updatedAt: null, isDeleted: false, isProfileCompleted: true };
      profiles = [...profiles, created];
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Đã tạo hồ sơ.", data: created }) });
    }
    if (url.pathname === `/api/patient-profiles/${PROFILE_2}` && method === "PUT") {
      updatePayload = route.request().postDataJSON();
      profiles = profiles.map((profile) => profile.id === PROFILE_2 ? { ...profile, ...updatePayload, updatedAt: "2026-07-12T01:00:00Z" } : profile);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Đã cập nhật hồ sơ.", data: profiles.find((profile) => profile.id === PROFILE_2) }) });
    }
    if (url.pathname === `/api/patient-profiles/${PROFILE_2}` && method === "DELETE") {
      deletedProfileId = PROFILE_2;
      profiles = profiles.filter((profile) => profile.id !== PROFILE_2);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, message: "Đã xóa hồ sơ." }) });
    }

    const paged = ["/api/doctors", "/api/ai-configs", "/api/medical-facilities", "/api/medical-departments", "/api/icd-chapters"].includes(url.pathname);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: paged ? { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 } : [] }) });
  });

  await page.goto("/app/admin/patient-profiles", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Hồ sơ bệnh nhân", level: 2 })).toBeVisible();
  await expect(page.getByText("User 11111111", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Tạo hồ sơ" }).click();
  const dialog = page.getByRole("dialog", { name: "Tạo hồ sơ bệnh nhân" });
  await dialog.getByLabel("User ID").fill(USER_2);
  await dialog.getByLabel("Nhóm máu").selectOption("O+");
  await dialog.getByLabel("Chiều cao (cm)").fill("172");
  await dialog.getByLabel("Cân nặng (kg)").fill("68");
  await dialog.getByLabel("Ghi chú dị ứng").fill("Không ghi nhận");
  await dialog.getByRole("button", { name: "Thêm bệnh nền" }).click();
  await dialog.getByLabel("Tên bệnh").fill("Tăng huyết áp");
  await dialog.getByLabel("Từ ngày").fill("2024-01-01");
  await dialog.getByRole("button", { name: "Tạo hồ sơ" }).click();

  expect(createPayload).toEqual({
    userId: USER_2,
    bloodType: "O+",
    height: 172,
    weight: 68,
    allergyNote: "Không ghi nhận",
    chronicDiseases: [{ diseaseName: "Tăng huyết áp", from: "2024-01-01", to: null, note: null }],
  });
  await expect(page.getByText("User 22222222", { exact: true })).toBeVisible();

  const createdRow = page.locator(".patient-profile-row").filter({ hasText: "User 22222222" });
  await createdRow.getByRole("button", { name: "Sửa" }).click();
  const editDialog = page.getByRole("dialog", { name: "Cập nhật hồ sơ bệnh nhân" });
  await editDialog.getByLabel("Cân nặng (kg)").fill("70");
  await editDialog.getByRole("button", { name: "Lưu cập nhật" }).click();
  expect(updatePayload).toEqual({
    bloodType: "O+",
    height: 172,
    weight: 70,
    allergyNote: "Không ghi nhận",
    chronicDiseases: [{ diseaseName: "Tăng huyết áp", from: "2024-01-01", to: null, note: null }],
  });
  expect(updatePayload.userId).toBeUndefined();

  await page.locator(".patient-profile-row").filter({ hasText: "User 22222222" }).getByRole("button", { name: "Xóa" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa hồ sơ" }).click();
  await expect(page.getByText("User 22222222", { exact: true })).toHaveCount(0);
  expect(deletedProfileId).toBe(PROFILE_2);
});
