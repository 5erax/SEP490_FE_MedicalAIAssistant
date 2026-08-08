import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");
const ADMIN_ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");
test.describe("global navigation UX", () => {
  test("internal links navigate without reloading the document", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/");
    await page.evaluate(() => {
      window.__medimateSpaSentinel = "preserved";
    });

    await page.locator('a[href="/pricing"]').first().click();

    await expect(page).toHaveURL(/\/pricing$/);
    await expect.poll(() => page.evaluate(() => window.__medimateSpaSentinel)).toBe("preserved");
  });

  test("browser back and forward keep the React route in sync", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/");

    await page.locator('a[href="/pricing"]').first().click();
    await expect(page).toHaveURL(/\/pricing$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.locator(".pricing-hero h1")).toBeVisible();
  });

  test("provides page titles and keyboard skip navigation", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/login");

    await expect(page).toHaveTitle("Đăng nhập | MediMate AI");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Bỏ qua đến nội dung chính" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("hides Google login when the current origin is not authorized", async ({ page }) => {
    await preparePage(page);
    await openRoute(page, "/login");

    await expect(page.getByText("Đăng nhập Google đang tắt cho domain này.")).toBeVisible();
    await expect(page.locator(".google-login-wrap")).toHaveCount(0);
  });

  test("free users can open lab analysis while other premium routes stay gated", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
    await openRoute(page, "/dashboard");

    const recordsLink = page.locator('.user-shell-nav a[href="/records"]');
    await expect(recordsLink).toBeVisible();
    await recordsLink.click();
    await expect(page).toHaveURL(/\/records$/);
    await expect(page.getByRole("heading", { name: "Đọc phiếu xét nghiệm rõ ràng hơn" })).toBeVisible();

    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/pricing\?returnTo=%2Fchat$/);
  });

  test("free users can open profile from the account menu", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        userId: "55555555-5555-4555-8555-555555555555",
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
    await page.route("**/api/users/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: "55555555-5555-4555-8555-555555555555",
          displayName: "Nguyễn Minh",
          email: "patient@example.com",
          avatarUrl: "https://example.com/avatar.png",
          gender: 1,
        },
      }),
    }));
    await page.route("**/api/patient-profiles**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          items: [{
            id: "66666666-6666-4666-8666-666666666666",
            userId: "55555555-5555-4555-8555-555555555555",
            bloodType: "O+",
            isProfileCompleted: true,
          }],
        },
      }),
    }));
    await page.route("**/api/user-subscriptions/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    }));

    await openRoute(page, "/dashboard");
    await expect(page.locator(".account-menu-trigger")).toContainText("Nguyễn Minh");
    await expect(page.locator(".account-menu-trigger img")).toHaveAttribute("src", "https://example.com/avatar.png");
    await page.locator(".account-menu-trigger").click();
    await expect(page.getByRole("region", { name: "Menu tài khoản" })).toBeVisible();
    await expect(page.locator(".account-menu-summary")).toContainText("Nguyễn Minh");
    await expect(page.locator(".account-menu-summary img")).toHaveAttribute("src", "https://example.com/avatar.png");
    await expect(page.getByRole("button", { name: "Mở tùy chọn hiển thị", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Lịch sử giao dịch" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
    await page.getByRole("button", { name: "Hồ sơ" }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { name: "Thông tin cá nhân" })).toBeVisible();

    const storedAuth = await page.evaluate(() => JSON.parse(localStorage.getItem("medimate.auth")));
    expect(storedAuth).toMatchObject({
      email: "patient@example.com",
      displayName: "Nguyễn Minh",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  test("workspace route changes keep the account identity while user API is delayed", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        userId: "55555555-5555-4555-8555-555555555555",
        displayName: "Phước Hà",
        email: "phuoc.ha@example.com",
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);

    let meRequests = 0;
    await page.route("**/api/users/me", async (route) => {
      meRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "55555555-5555-4555-8555-555555555555",
            displayName: "Phước Hà",
            email: "phuoc.ha@example.com",
            roles: ["Patient"],
          },
        }),
      });
    });

    await openRoute(page, "/dashboard");
    const accountTrigger = page.locator(".account-menu-trigger");
    await expect(accountTrigger).toContainText("Phước Hà");
    await expect(accountTrigger).not.toContainText("Người dùng");

    await page.locator('.user-shell-nav a[href="/recovery-plan"]').click();
    await expect(page).toHaveURL(/\/recovery-plan$/);
    await expect(accountTrigger).toContainText("Phước Hà");
    await expect(accountTrigger).not.toContainText("Người dùng");
    await expect.poll(() => meRequests).toBe(1);
  });

  test("patient onboarding tour auto opens once and can be restarted manually", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        userId: "55555555-5555-4555-8555-555555555555",
        displayName: "Phước Hà",
        email: "phuoc.ha@example.com",
        roles: ["Patient"],
        patientOnboardingPending: true,
      }));
    }, ACCESS_TOKEN);
    await page.route("**/api/users/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: "55555555-5555-4555-8555-555555555555",
          displayName: "Phước Hà",
          email: "phuoc.ha@example.com",
          roles: ["Patient"],
        },
      }),
    }));

    await openRoute(page, "/dashboard");

    const tour = page.getByRole("dialog", { name: "Bắt đầu với MediMate" });
    await expect(tour).toBeVisible();
    await expect(tour).toContainText("1 / 6");
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await expect(page.getByRole("dialog", { name: "Khu vực làm việc cá nhân" })).toBeVisible();
    await page.getByRole("button", { name: "Quay lại" }).click();
    await expect(tour).toBeVisible();
    await page.getByRole("button", { name: "Bỏ qua" }).click();
    await expect(tour).toBeHidden();

    const storedAfterSkip = await page.evaluate(() => {
      const auth = JSON.parse(localStorage.getItem("medimate.auth"));
      const statusKey = Object.keys(localStorage).find((key) => key.startsWith("medimate.onboarding.patient.patient-v1."));
      return {
        auth,
        status: statusKey ? JSON.parse(localStorage.getItem(statusKey)) : null,
      };
    });
    expect(storedAfterSkip.auth.patientOnboardingPending).toBe(false);
    expect(storedAfterSkip.status).toMatchObject({ status: "skipped", tourVersion: "patient-v1" });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("dialog", { name: "Bắt đầu với MediMate" })).toHaveCount(0);

    await page.getByRole("button", { name: "Mở hướng dẫn sử dụng" }).click();
    await expect(page.getByRole("region", { name: "Hướng dẫn sử dụng" })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu tour" }).click();
    await expect(page.getByRole("dialog", { name: "Bắt đầu với MediMate" })).toBeVisible();

    for (let index = 0; index < 5; index += 1) {
      await page.getByRole("button", { name: "Tiếp tục" }).click();
    }
    await page.getByRole("button", { name: "Hoàn tất" }).click();

    const storedAfterFinish = await page.evaluate(() => {
      const statusKey = Object.keys(localStorage).find((key) => key.startsWith("medimate.onboarding.patient.patient-v1."));
      return statusKey ? JSON.parse(localStorage.getItem(statusKey)) : null;
    });
    expect(storedAfterFinish).toMatchObject({ status: "completed", tourVersion: "patient-v1" });
  });

  test("patient sidebar hides clinical diagnosis and display preferences", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        displayName: "Premium Patient",
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);

    await openRoute(page, "/dashboard");

    await expect(page.locator('.user-shell-nav a[href="/dashboard"]')).toBeVisible();
    await expect(page.locator('.user-shell-nav a[href="/profile"]')).toHaveCount(0);
    await expect(page.locator('.user-shell-mobile-nav a[href="/profile"]')).toHaveCount(0);
    await expect(page.locator('.user-shell-nav a[href="/medication"], .user-shell-nav button[data-onboarding="patient-nav-patient.medication"]')).toHaveCount(0);
    await expect(page.locator('.user-shell-nav a[href="/my-medications"]')).toHaveCount(0);
    await expect(page.locator('.user-shell-mobile-nav a[href="/medication"]')).toHaveCount(0);
    await expect(page.locator('.user-shell-nav a[href="/symptom"]')).toHaveCount(0);
    await expect(page.locator('.user-shell-mobile-nav a[href="/symptom"]')).toHaveCount(0);
    await page.locator(".account-menu-trigger").click();
    await expect(page.getByRole("button", { name: "Hồ sơ" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thuốc & lịch nhắc" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mở tùy chọn hiển thị", exact: true })).toHaveCount(0);
  });

  test("mobile workspace drawer opens and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
    await openRoute(page, "/dashboard");

    const menuButton = page.getByRole("button", { name: "Mở menu" });
    await menuButton.click();
    const drawer = page.getByRole("dialog", { name: "Điều hướng không gian cá nhân" });
    await expect(drawer).toHaveClass(/mobile-open/);
    await expect(drawer.getByRole("button", { name: "Đóng menu" })).toBeFocused();
    await expect(page.locator(".user-shell-main")).toHaveJSProperty("inert", true);
    await expect(page.locator(".user-shell-mobile-nav")).toHaveJSProperty("inert", true);

    const upgradeButton = drawer.getByRole("button", { name: "Nâng cấp" });
    await upgradeButton.focus();
    await page.keyboard.press("Tab");
    await expect(drawer.getByRole("link", { name: "MediMate" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.locator(".user-shell-main")).toHaveJSProperty("inert", false);
    await expect(page.locator(".user-shell-mobile-nav")).toHaveJSProperty("inert", false);
    await expect(menuButton).toBeFocused();
  });

  test("workspace search carries the query into the facility map", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
    await openRoute(page, "/dashboard");

    await page.getByRole("searchbox", { name: "Tìm cơ sở y tế" }).fill("Chợ Rẫy");
    await page.getByRole("searchbox", { name: "Tìm cơ sở y tế" }).press("Enter");

    await expect(page).toHaveURL(/\/map\?search=Ch%E1%BB%A3%20R%E1%BA%ABy$/);
    await expect(page.getByRole("searchbox", { name: "Lọc danh sách cơ sở y tế" })).toHaveValue("Chợ Rẫy");
  });

  test("signup sends first-login patients to profile setup before return intent", async ({ page }) => {
    await preparePage(page);
    await page.route("**/api/authentication/send-register-otp", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, message: "Đã gửi mã xác thực." }),
    }));
    await page.route("**/api/authentication/register", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: ACCESS_TOKEN,
          roles: ["Patient"],
          isFirstLogin: true,
          email: "new.patient@gmail.com",
        },
      }),
    }));

    await openRoute(page, "/signup?returnTo=%2Fmap%3Fsearch%3Dtim%2520mach%23results");
    await page.getByLabel("Email").fill("new.patient@gmail.com");
    await page.getByLabel("Tên đăng nhập").fill("new-patient");
    await page.getByLabel("Tên hiển thị").fill("New Patient");
    await page.locator('input[name="password"]').fill("Example123!");
    await page.locator('input[name="confirmPassword"]').fill("Example123!");
    await page.getByLabel("Ngày sinh").fill("2000-01-01");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Gửi mã xác thực" }).click();

    await page.getByLabel("Mã xác thực").fill("123456");
    await page.getByRole("button", { name: "Xác nhận và tạo tài khoản" }).click();

    await expect(page).toHaveURL(/\/patient\/profile\/setup\?returnTo=%2Fmap%3Fsearch%3Dtim%2520mach%23results$/);
  });

  test("completed patient profile does not reopen onboarding after login", async ({ page }) => {
    await preparePage(page);
    await page.route("**/api/authentication/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: ACCESS_TOKEN,
          roles: ["Patient"],
          firstLogin: true,
          isProfileCompleted: true,
          email: "patient@example.com",
          displayName: "Patient Example",
          phoneNumber: "0901234567",
          address: "123 Sensitive Street",
          refreshToken: "sensitive-refresh-token",
        },
      }),
    }));

    await openRoute(page, "/login");
    await page.getByLabel("Email").fill("patient@example.com");
    await page.getByLabel("Mật khẩu").fill("Example123!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    const storedAuth = await page.evaluate(() => JSON.parse(localStorage.getItem("medimate.auth")));
    expect(storedAuth).toMatchObject({
      firstLogin: false,
      isFirstLogin: false,
      isProfileCompleted: true,
      email: "patient@example.com",
      displayName: "Patient Example",
    });
    expect(storedAuth).not.toHaveProperty("phoneNumber");
    expect(storedAuth).not.toHaveProperty("address");
    expect(storedAuth).not.toHaveProperty("refreshToken");
  });

  test("patient profile lookup scans later pages before reopening onboarding", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        userId: "55555555-5555-4555-8555-555555555555",
        roles: ["Patient"],
        isFirstLogin: true,
        isProfileCompleted: false,
      }));
    }, ACCESS_TOKEN);
    await page.route("**/api/users/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: "55555555-5555-4555-8555-555555555555",
          displayName: "Patient Example",
        },
      }),
    }));
    await page.route("**/api/patient-profiles**", (route) => {
      const url = new URL(route.request().url());
      const pageNumber = Number(url.searchParams.get("PageNumber") || 1);
      const items = pageNumber === 1
        ? [{ id: "other-profile", userId: "other-user" }]
        : [{ id: "matched-profile", userId: "55555555-5555-4555-8555-555555555555" }];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            items,
            pageNumber,
            pageSize: 100,
            totalPages: 2,
          },
        }),
      });
    });

    await openRoute(page, "/patient/profile/setup?returnTo=%2Fdashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    const storedAuth = await page.evaluate(() => JSON.parse(localStorage.getItem("medimate.auth")));
    expect(storedAuth).toMatchObject({
      firstLogin: false,
      isFirstLogin: false,
      isProfileCompleted: true,
    });
  });

  test("existing auth storage keeps display identity but removes sensitive profile data", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        userId: "55555555-5555-4555-8555-555555555555",
        roles: ["Patient"],
        email: "patient@example.com",
        displayName: "Patient Example",
        phoneNumber: "0901234567",
        address: "123 Sensitive Street",
      }));
    }, ACCESS_TOKEN);

    await openRoute(page, "/dashboard");

    const storedAuth = await page.evaluate(() => JSON.parse(localStorage.getItem("medimate.auth")));
    expect(storedAuth).toMatchObject({
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      email: "patient@example.com",
      displayName: "Patient Example",
    });
    expect(storedAuth).not.toHaveProperty("phoneNumber");
    expect(storedAuth).not.toHaveProperty("address");
  });

  test("doctor first login opens the Doctor and Staff workspace", async ({ page }) => {
    await preparePage(page);
    await page.route("**/api/authentication/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: ACCESS_TOKEN,
          roles: ["Doctor"],
          firstLogin: true,
          isProfileCompleted: false,
          email: "doctor@example.com",
        },
      }),
    }));
    await page.route("**/api/**", (route) => {
      if (new URL(route.request().url()).pathname === "/api/authentication/login") {
        return route.fallback();
      }
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await openRoute(page, "/login");
    await page.getByLabel("Email").fill("doctor@example.com");
    await page.getByLabel("Mật khẩu").fill("Example123!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/app\/staff$/);
    await expect(page.getByRole("heading", { name: /Xin chào/ })).toBeVisible();
  });

  test("rejects external return intent after login", async ({ page }) => {
    await preparePage(page);
    await page.route("**/api/authentication/login", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: ACCESS_TOKEN,
          roles: ["Patient"],
          isFirstLogin: false,
          email: "patient@example.com",
        },
      }),
    }));

    await openRoute(page, "/login?returnTo=https%3A%2F%2Fevil.example");
    await page.getByLabel("Email").fill("patient@example.com");
    await page.getByLabel("Mật khẩu").fill("Example123!");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("admin sections support deep links and browser history", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        email: "admin@example.com",
        roles: ["Admin"],
      }));
    }, ADMIN_ACCESS_TOKEN);
    await page.route("**/api/**", (route) => route.abort());

    await openRoute(page, "/admin/users");
    await expect(page).toHaveURL(/\/app\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Tài khoản chờ duyệt" })).toBeVisible();

    await page.getByRole("button", { name: "Bác sĩ", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/admin\/doctors$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Tài khoản chờ duyệt" })).toBeVisible();
  });

  test("admin subscription catalog keeps unsafe mutations unavailable", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        displayName: "Admin User",
        roles: ["Admin"],
      }));
    }, ADMIN_ACCESS_TOKEN);

    await openRoute(page, "/app/admin/subscriptions");
    await expect(page.getByText("Trang đang ở chế độ chỉ xem.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Tạo gói", exact: true })).toHaveCount(0);
    const reloadButton = page.getByRole("button", { name: "Đồng bộ" });
    await reloadButton.focus();
    await page.keyboard.press("Enter");
    await expect(reloadButton).toBeFocused();
    await expect(page.locator("#root")).toHaveJSProperty("inert", false);
  });


  test("first-login patient is sent to profile setup before symptom intake", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
        isFirstLogin: true,
      }));
    }, ACCESS_TOKEN);
    await openRoute(page, "/symptom");
    await expect(page).toHaveURL(/\/patient\/profile\/setup\?returnTo=%2Fsymptom$/);
    await expect(page.locator(".profile-setup-heading h2")).toBeVisible();
  });

  test("completed patient can open assessment intake directly", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
        isFirstLogin: false,
        isProfileCompleted: true,
      }));
    }, ACCESS_TOKEN);

    await openRoute(page, "/symptom");
    await expect(page).toHaveURL(/\/symptom$/);
    await expect(page.locator(".assessment-header h1")).toContainText("Phân tích lâm sàng");
  });

  test("medical assistant keeps primary actions visible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await preparePage(page);

    await openRoute(page, "/medical-assistant");
    await expect(page.getByRole("button", { name: "Bắt đầu mô tả triệu chứng" })).toBeVisible();
  });

  test("removed safety guide resolves to the not-found page", async ({ page }) => {
    await preparePage(page);

    await openRoute(page, "/medical-assistant/safety");
    await expect(page.getByRole("heading", { name: "Trang này chưa tồn tại." })).toBeVisible();
  });

  test("permission matrix routes each role to an allowed workspace", async ({ page }) => {
    await preparePage(page);
    await page.goto("/");
    await page.evaluate((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
    await openRoute(page, "/app/admin");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.evaluate(() => localStorage.clear());
    await page.goto("/app/admin");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp%2Fadmin$/);
  });
});
