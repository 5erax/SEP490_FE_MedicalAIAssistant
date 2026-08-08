import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

test("patient profile setup remains accessible at narrow widths", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      firstLogin: true,
      isProfileCompleted: false,
    }));
  }, ACCESS_TOKEN);

  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "55555555-5555-4555-8555-555555555555",
        displayName: "Nguyen Minh",
        address: "",
        gender: 1,
        dateOfBirth: null,
        isFirstLogin: true,
        isProfileCompleted: false,
      },
    }),
  }));
  await page.route("**/api/patient-profiles**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: null,
    }),
  }));

  await page.goto("/patient/profile/setup", { waitUntil: "domcontentloaded" });
  const displayName = page.locator("#patient-profile-displayName");
  await expect(displayName).toBeVisible();
  const mobileProgress = page.locator(".profile-setup-mobile-progress");
  await expect(mobileProgress).toBeVisible();
  await expect(mobileProgress).toContainText("/7 mục cơ bản");
  await expect(mobileProgress).toContainText("trường có nhãn “bắt buộc”");

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = accessibility.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);

  expect(seriousViolations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await displayName.focus();
  await expect(displayName).toBeFocused();
  await expect(displayName).toHaveCSS("outline-width", "3px");
});

test("patient profile setup validates contact and health values before saving", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      firstLogin: true,
      isProfileCompleted: false,
    }));
  }, ACCESS_TOKEN);

  let updateRequests = 0;
  let patientProfileCreateRequests = 0;
  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: "55555555-5555-4555-8555-555555555555",
        displayName: "Nguyễn Minh",
        address: "",
        gender: 1,
        dateOfBirth: null,
        isFirstLogin: true,
        isProfileCompleted: false,
      },
    }),
  }));
  await page.route("**/api/patient-profiles**", (route) => {
    if (route.request().method() === "POST") patientProfileCreateRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: null,
      }),
    });
  });
  await page.route("**/api/users/*", (route) => {
    if (new URL(route.request().url()).pathname === "/api/users/me") {
      return route.fallback();
    }
    updateRequests += 1;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  await page.goto("/patient/profile/setup", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Ngày sinh").fill("2099-01-01");
  await page.getByLabel("Số điện thoại").fill("12abc");
  await page.getByLabel("Địa chỉ").fill("A");
  await page.getByLabel("Chiều cao (cm)").fill("300");
  await page.getByLabel("Từ ngày").fill("2026-07-20");
  await page.getByLabel("Đến ngày").fill("2026-07-10");
  await page.getByRole("button", { name: "Hoàn tất hồ sơ" }).click();

  await expect(page.getByText("Ngày sinh phải từ năm 1900 đến hôm nay.", { exact: true })).toBeVisible();
  await expect(page.getByText("Số điện thoại phải có 9-15 chữ số và có thể bắt đầu bằng +.", { exact: true })).toBeVisible();
  await expect(page.getByText("Địa chỉ phải có từ 5 đến 255 ký tự.", { exact: true })).toBeVisible();
  await expect(page.getByText("Chiều cao (cm) phải từ 40 đến 250.", { exact: true })).toBeVisible();
  await expect(page.getByText("Vui lòng nhập tên bệnh nền.", { exact: true })).toBeVisible();
  await expect(page.getByText("Đến ngày không được trước từ ngày.", { exact: true })).toBeVisible();
  await expect(page.locator(".profile-setup-error-summary")).toBeFocused();
  await expect(page.getByLabel("Tên bệnh")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Đến ngày")).toHaveAttribute("aria-invalid", "true");
  expect(updateRequests).toBe(0);
  expect(patientProfileCreateRequests).toBe(0);
});

test("patient profile setup submits all chronic disease fields from the Swagger contract", async ({ page }) => {
  await preparePage(page);
  const userId = "55555555-5555-4555-8555-555555555555";
  await page.addInitScript(({ accessToken, userId: storedUserId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: storedUserId,
      roles: ["Patient"],
      firstLogin: true,
      isProfileCompleted: false,
    }));
  }, { accessToken: ACCESS_TOKEN, userId });

  let userPayload = null;
  let patientProfilePayload = null;

  await page.route("**/api/users/me", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: {
        id: userId,
        displayName: "Nguyễn Minh",
        address: "",
        gender: 1,
        dateOfBirth: null,
        isFirstLogin: true,
        isProfileCompleted: false,
      },
    }),
  }));
  await page.route("**/api/users/*", (route) => {
    if (new URL(route.request().url()).pathname === "/api/users/me") return route.fallback();
    userPayload = route.request().postDataJSON();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: userPayload }),
    });
  });
  await page.route("**/api/patient-profiles**", (route) => {
    if (route.request().method() === "POST") {
      patientProfilePayload = route.request().postDataJSON();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: "profile-id", ...patientProfilePayload } }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: null,
      }),
    });
  });

  await page.goto("/patient/profile/setup", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Ngày sinh").fill("1990-01-02");
  await page.getByLabel("Số điện thoại").fill("0901234567");
  await page.getByLabel("Địa chỉ").fill("12 Nguyễn Trãi, Hà Nội");
  await page.getByLabel("Nhóm máu").selectOption("A+");
  await page.getByLabel("Chiều cao (cm)").fill("180");
  await page.getByLabel("Cân nặng (kg)").fill("60");
  await page.getByLabel("Dị ứng").fill("Dị ứng hải sản");
  await page.getByLabel("Tên bệnh").fill("Tăng huyết áp");
  await page.getByLabel("Từ ngày").fill("2024-01-01");
  await page.getByLabel("Đến ngày").fill("2026-07-13");
  await page.getByLabel("Ghi chú").fill("Theo dõi huyết áp hằng ngày");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(mobileLayout.scrollWidth).toBeLessThanOrEqual(mobileLayout.clientWidth);
  await expect(page.getByRole("group", { name: "Bệnh nền #1" })).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tất hồ sơ" }).click();

  await expect.poll(() => patientProfilePayload).not.toBeNull();
  expect(userPayload).toEqual({
    displayName: "Nguyễn Minh",
    address: "12 Nguyễn Trãi, Hà Nội",
    gender: 1,
    dateOfBirth: "1990-01-02",
    phoneNumber: "0901234567",
  });
  expect(patientProfilePayload).toEqual({
    userId,
    bloodType: "A+",
    height: 180,
    weight: 60,
    allergyNote: "Dị ứng hải sản",
    chronicDiseases: [{
      diseaseName: "Tăng huyết áp",
      from: "2024-01-01",
      to: "2026-07-13",
      note: "Theo dõi huyết áp hằng ngày",
    }],
  });
});

test("patient adds a chronic disease with one click from the read-only profile", async ({ page }) => {
  await preparePage(page);
  const userId = "55555555-5555-4555-8555-555555555555";
  await page.addInitScript(({ accessToken, storedUserId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: storedUserId,
      roles: ["Patient"],
    }));
  }, { accessToken: ACCESS_TOKEN, storedUserId: userId });

  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: userId, displayName: "Nguyễn Minh", email: "patient@example.com" },
        }),
      });
    }
    if (url.pathname === `/api/patient-profiles/by-user/${userId}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: null,
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/profile?tab=medical", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Thêm bệnh nền" })).toBeEnabled();
  await page.getByRole("button", { name: "Thêm bệnh nền" }).click();

  await expect(page.getByRole("button", { name: "Lưu hồ sơ" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Bệnh nền #1" })).toBeVisible();
  await expect(page.getByLabel("Tên bệnh")).toBeEnabled();
  await expect(page.getByLabel("Tên bệnh")).toBeFocused();
});
