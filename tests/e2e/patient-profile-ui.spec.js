import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

async function openPatientProfile(page, path = "/profile", { subscriptions = [] } = {}) {
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
    if (url.pathname === "/api/patient-profiles") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items: [],
            pageNumber: 1,
            pageSize: 100,
            totalCount: 0,
            totalPages: 0,
          },
        }),
      });
    }
    if (url.pathname === "/api/user-subscriptions/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: subscriptions }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#profile-panel-info")).toBeVisible();
}

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
