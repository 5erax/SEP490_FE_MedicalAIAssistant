import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function openPatientProfile(page, path = "/profile", {
  patientProfile = null,
  subscriptions = [],
  usage = {
    quotaCode: "SERVICE_CREDIT",
    grantedCount: 0,
    usedCount: 0,
    reservedCount: 0,
    remainingCount: 0,
  },
} = {}) {
  const patientProfilePaths = [];
  await preparePage(page);
  await page.addInitScript(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, userId: USER_ID });

  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: USER_ID,
            displayName: "Nguyễn Minh",
            email: "patient@example.com",
            gender: 1,
            dateOfBirth: "1990-01-01",
            phoneNumber: "",
            address: "",
          },
        }),
      });
    }
    if (url.pathname.startsWith("/api/patient-profiles")) {
      patientProfilePaths.push(url.pathname);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: patientProfile,
        }),
      });
    }
    if (url.pathname === "/api/user-subscriptions/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: subscriptions }),
      });
    }
    if (url.pathname === "/api/me/subscription-usage") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: usage,
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#profile-panel-info")).toBeVisible();
  return patientProfilePaths;
}

test("patient profile loads medical data from the current user's endpoint", async ({ page }) => {
  const patientProfilePaths = await openPatientProfile(page, "/profile", {
    patientProfile: {
      id: "66666666-6666-4666-8666-666666666666",
      userId: USER_ID,
      bloodType: "A+",
      height: 180,
      weight: 60,
      allergyNote: "Dị ứng hải sản",
      chronicDiseases: [],
    },
  });

  await expect.poll(() => patientProfilePaths.length).toBeGreaterThan(0);
  expect([...new Set(patientProfilePaths)]).toEqual([`/api/patient-profiles/by-user/${USER_ID}`]);
  await page.getByRole("tab", { name: "Hồ sơ y tế" }).first().click();
  await expect(page.locator("#profile-panel-medical")).toBeVisible();
  await expect(page.getByLabel("Nhóm máu")).toHaveValue("A+");
  await expect(page.getByLabel("Chiều cao (cm)")).toHaveValue("180");
  await expect(page.getByLabel("Cân nặng (kg)")).toHaveValue("60");
  await expect(page.getByLabel("Dị ứng")).toHaveValue("Dị ứng hải sản");
  await expect(page.getByText("Không thể tải hồ sơ y tế", { exact: true })).toHaveCount(0);
});

test("patient profile stays usable at 320px without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await openPatientProfile(page);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  await expect(page.getByRole("tab", { name: "Thông tin" }).last()).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Giao dịch" }).last()).toBeVisible();
  await expect(page.getByRole("tab", { name: "Bảo mật" }).last()).toBeVisible();
  const mobileTabs = await page.locator(".mobile-tabs").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(mobileTabs.scrollWidth).toBeLessThanOrEqual(mobileTabs.clientWidth);
  await expect(page.getByRole("button", { name: "Chỉnh sửa" })).toBeVisible();
});

test("patient profile tabs support keyboard navigation", async ({ page }) => {
  await openPatientProfile(page);

  const infoTab = page.locator("#profile-tab-info");
  await infoTab.focus();
  await page.keyboard.press("ArrowRight");

  const medicalTab = page.locator("#profile-tab-medical");
  await expect(medicalTab).toBeFocused();
  await expect(medicalTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#profile-panel-medical")).toBeVisible();
});

test("saving the medical tab drops a chronic-disease row that was added but left blank", async ({ page }) => {
  let createBody = null;
  await openPatientProfile(page);
  await page.route("**/api/patient-profiles", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    createBody = route.request().postDataJSON();
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { id: "profile-1", ...createBody } }),
    });
  });

  await page.getByRole("tab", { name: "Hồ sơ y tế" }).click();
  await page.getByRole("button", { name: "Chỉnh sửa" }).click();
  await page.getByRole("button", { name: "Thêm bệnh nền" }).click();
  await page.getByLabel("Tên bệnh").fill("Hen suyễn");

  // A second, completely blank row - added but never filled in.
  await page.getByRole("button", { name: "Thêm bệnh nền" }).click();
  await expect(page.getByRole("group", { name: "Bệnh nền #2" })).toBeVisible();

  await page.getByRole("button", { name: "Lưu hồ sơ" }).click();

  expect(createBody.chronicDiseases).toEqual([
    { diseaseName: "Hen suyễn", from: null, to: null, note: null },
  ]);
  await expect(page.getByRole("group", { name: "Bệnh nền #1" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Bệnh nền #2" })).toHaveCount(0);
});

test("security tab updates the password with the current/new/confirm fields", async ({ page }) => {
  let updateBody = null;
  await openPatientProfile(page);
  await page.route("**/api/authentication/update-password", (route) => {
    updateBody = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "Đổi mật khẩu thành công.", data: null }),
    });
  });

  await page.getByRole("tab", { name: "Bảo mật" }).click();
  await expect(page.getByRole("tab", { name: "Bảo mật" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Mật khẩu hiện tại").fill("OldPass123!");
  await page.getByLabel(/^Mật khẩu mới/).fill("NewPass456!");
  await page.getByLabel("Nhập lại mật khẩu mới").fill("NewPass456!");
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();

  await expect(page.locator(".security-message-success")).toBeVisible();
  expect(updateBody).toEqual({
    currentPassword: "OldPass123!",
    newPassword: "NewPass456!",
    confirmNewPassword: "NewPass456!",
  });
  await expect(page.getByLabel("Mật khẩu hiện tại")).toHaveValue("");
});

test("security tab blocks submit when the new password confirmation doesn't match", async ({ page }) => {
  let updateCalled = false;
  await openPatientProfile(page);
  await page.route("**/api/authentication/update-password", (route) => {
    updateCalled = true;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: null }) });
  });

  await page.getByRole("tab", { name: "Bảo mật" }).click();
  await page.getByLabel("Mật khẩu hiện tại").fill("OldPass123!");
  await page.getByLabel(/^Mật khẩu mới/).fill("NewPass456!");
  await page.getByLabel("Nhập lại mật khẩu mới").fill("Mismatch789!");
  await page.getByRole("button", { name: "Lưu mật khẩu mới" }).click();

  await expect(page.getByText("Mật khẩu mới nhập lại chưa khớp.", { exact: true })).toBeVisible();
  expect(updateCalled).toBe(false);
});

test("patient profile has no serious automated accessibility violations", async ({ page }) => {
  await openPatientProfile(page);

  const results = await new AxeBuilder({ page })
    .include(".profile-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);

  expect(seriousViolations).toEqual([]);
});

test("patient profile remains legible in forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openPatientProfile(page);

  await expect(page.getByRole("button", { name: "Chỉnh sửa" })).toBeVisible();
  await page.getByRole("button", { name: "Chỉnh sửa" }).click();
  await expect(page.getByLabel("Họ và tên")).toBeEditable();
  await expect(page.locator("#profile-panel-info")).toHaveCSS("border-top-style", "solid");
});

test("patient profile localizes known plan and subscription labels", async ({ page }) => {
  await openPatientProfile(page, "/profile", {
    subscriptions: [{ planName: "Free", statusName: "Active" }],
  });

  await page.getByRole("tab", { name: "Gói dịch vụ" }).first().click();
  const packagePanel = page.locator("#profile-panel-package");
  await expect(packagePanel.getByText("Miễn phí", { exact: true })).toBeVisible();
  await expect(packagePanel.getByText("Đang hoạt động", { exact: false })).toBeVisible();
  await expect(packagePanel.getByText("Free", { exact: true })).toHaveCount(0);
});

test("patient profile shows aggregate shared credits and non-expiring package history", async ({ page }) => {
  await openPatientProfile(page, "/profile", {
    usage: {
      quotaCode: "SERVICE_CREDIT",
      grantedCount: 35,
      usedCount: 8,
      reservedCount: 2,
      remainingCount: 25,
    },
    subscriptions: [{
      id: "subscription-active",
      planName: "Gói 10 lượt",
      status: 1,
      endDate: null,
    }, {
      id: "subscription-pending",
      planName: "Gói 25 lượt",
      status: 0,
      endDate: null,
    }],
  });

  await page.getByRole("tab", { name: "Gói dịch vụ" }).first().click();
  const packagePanel = page.locator("#profile-panel-package");
  await expect(packagePanel.getByText("25 lượt", { exact: true })).toBeVisible();
  await expect(packagePanel).toContainText("Đã cấp 35 · đã dùng 8 · đang giữ 2");
  await expect(packagePanel.getByText("Thời hạn: Không hết hạn", { exact: true })).toBeVisible();
  await expect(packagePanel.getByText("Chưa cấp lượt dùng cho đến khi thanh toán thành công", { exact: true })).toBeVisible();
  await expect(packagePanel.getByRole("button", { name: "Mua thêm lượt" })).toBeVisible();
});

test("patient profile does not present failed requests as empty real data", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, userId: USER_ID });
  await page.route("**/api/**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ success: false, message: "Internal service detail" }),
  }));

  await page.goto("/profile", { waitUntil: "domcontentloaded" });

  const profile = page.locator(".profile-page");
  await expect(profile.getByRole("alert").first()).toContainText("Chưa thể tải");
  await expect(profile.getByText("Không khả dụng", { exact: true })).toHaveCount(3);
  await expect(profile.getByText("0/5", { exact: true })).toHaveCount(0);
  await expect(profile.getByText("Free", { exact: true })).toHaveCount(0);
  await expect(profile.getByText("Tiêu chuẩn", { exact: true })).toHaveCount(0);
  await expect(profile.getByText("Internal service detail", { exact: false })).toHaveCount(0);
  await expect(profile.getByText("Không thể tải thông tin cá nhân", { exact: true })).toBeVisible();
  await expect(profile.getByRole("button", { name: "Thử tải lại" }).last()).toBeVisible();
});
