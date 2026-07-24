import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VISUAL_ROUTES, VISUAL_VIEWPORTS } from "./route-manifest.js";
import { openRoute, preparePage } from "./helpers.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const visualStyles = path.join(currentDirectory, "visual-stabilize.css");
const LANDING_MAP_STYLE = { version: 8, name: "Landing visual map", sources: {}, layers: [] };
const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");
const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");

test.describe("visual baseline", () => {
  for (const route of VISUAL_ROUTES) {
    for (const viewport of VISUAL_VIEWPORTS) {
      test(`${route.name} at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page);
        if (["profile-setup", "patient-dashboard", "symptom-analysis", "patient-chat", "patient-records", "patient-profile", "patient-recovery", "patient-medication"].includes(route.name)) {
          await page.addInitScript(({ accessToken, isProfileSetup }) => {
            localStorage.setItem("medimate.auth", JSON.stringify({
              accessToken,
              userId: "55555555-5555-4555-8555-555555555555",
              roles: ["Patient"],
              isPremium: true,
              firstLogin: isProfileSetup,
              isProfileCompleted: !isProfileSetup,
            }));
          }, {
            accessToken: PATIENT_TOKEN,
            isProfileSetup: route.name === "profile-setup",
          });
          await page.route("**/api/users/me", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                id: "55555555-5555-4555-8555-555555555555",
                displayName: "Nguyễn Minh",
                email: "patient@example.com",
                address: "",
                gender: 1,
                dateOfBirth: null,
                isFirstLogin: route.name === "profile-setup",
                isProfileCompleted: route.name !== "profile-setup",
              },
            }),
          }));
          await page.route("**/api/patient-profiles**", (request) => request.fulfill({
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
          }));
          await page.route("**/api/user-subscriptions/me", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: [],
            }),
          }));
        }
        if (["admin-overview", "admin-users"].includes(route.name)) {
          await page.addInitScript((accessToken) => {
            localStorage.setItem("medimate.auth", JSON.stringify({
              accessToken,
              email: "admin@example.com",
              roles: ["Admin"],
            }));
          }, ADMIN_TOKEN);
          const adminTotals = {
            "/api/users": 128,
            "/api/doctors": 42,
            "/api/ai-configs": 8,
            "/api/medical-facilities": 24,
          };
          const visualAdminUsers = route.name === "admin-users"
            ? [
              {
                identityId: "user-visual-01",
                displayName: "Nguyễn Minh Anh",
                email: "minhanh@example.com",
                status: "approved",
                isActive: true,
                isDeleted: false,
              },
              {
                identityId: "user-visual-02",
                displayName: "Trần Hoàng Nam",
                email: "hoangnam@example.com",
                status: "pending",
                isActive: true,
                isDeleted: false,
              },
              {
                identityId: "user-visual-03",
                displayName: "Lê Thu Hà",
                email: "thuha@example.com",
                status: "approved",
                isActive: true,
                isDeleted: false,
              },
            ]
            : [];
          await page.route("**/api/**", (request) => {
            const pathname = new URL(request.request().url()).pathname;
            if (pathname === "/api/users/me") {
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: { name: "Quản trị MediMate", roles: ["Admin"] },
                }),
              });
            }
            if (Object.hasOwn(adminTotals, pathname)) {
              const items = pathname === "/api/users" ? visualAdminUsers : [];
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: {
                    items,
                    pageNumber: 1,
                    pageSize: 10,
                    totalCount: pathname === "/api/users" && visualAdminUsers.length
                      ? visualAdminUsers.length
                      : adminTotals[pathname],
                    totalPages: 1,
                  },
                }),
              });
            }
            return request.fulfill({
              contentType: "application/json",
              body: JSON.stringify({ success: true, data: [] }),
            });
          });
        }
        if (route.name === "landing") {
          await page.route("**/api/medical-facilities/active", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: [{
                id: "11111111-1111-1111-1111-111111111111",
                facilityName: "Cơ sở y tế đang hoạt động",
                address: "Quận 1, TP.HCM",
                latitude: 10.7769,
                longitude: 106.7009,
              }],
            }),
          }));
          await page.route("**/api/subscription-plans/active", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: [{
                id: "22222222-2222-2222-2222-222222222222",
                planName: "MediMate+ 30 ngày",
                price: 149000,
                durationInDays: 30,
                featureLimitJson: JSON.stringify({
                  symptomAnalysisPerMonth: 30,
                  aiChatPerDay: 20,
                }),
              }],
            }),
          }));
          await page.route("https://basemaps.cartocdn.com/**", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify(LANDING_MAP_STYLE),
          }));
        }
        if (route.name === "nearby-clinic") {
          await page.route("**/api/medical-facilities/active", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: [{
                id: "11111111-1111-4111-8111-111111111111",
                facilityName: "Bệnh viện kiểm thử",
                address: "123 Nguyễn Trãi, TP.HCM",
                latitude: 10.77,
                longitude: 106.69,
                phone: "0123456789",
                facilityType: "Hospital",
                openingHours: "24/7",
                departments: [{
                  departmentId: "33333333-3333-4333-8333-333333333333",
                  departmentName: "Tim mạch",
                }],
              }],
            }),
          }));
          await page.route("**/api/facility-departments/active", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: [] }),
          }));
          await page.route("https://basemaps.cartocdn.com/**", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify(LANDING_MAP_STYLE),
          }));
        }
        if (route.name === "doctor-register") {
          await page.route(
            "**/api/doctor-invitations/validate?token=visual-doctor-token",
            (request) => request.fulfill({
              contentType: "application/json",
              body: JSON.stringify({
                success: true,
                data: {
                  isValid: true,
                  email: "doctor@example.com",
                  doctorId: null,
                  isLinkedToExistingDoctorProfile: false,
                  suggestedFullName: "BS. Nguyễn Minh Anh",
                },
              }),
            }),
          );
          await page.route("**/api/facility-departments/active", (request) => request.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: [{
                id: "11111111-1111-1111-1111-111111111111",
                facilityName: "Bệnh viện Đa khoa Thành phố",
                departmentName: "Khoa Nội tổng quát",
              }],
            }),
          }));
        }
        await openRoute(page, route.path);
        if (route.name === "landing") {
          await expect(page.locator(".maplibregl-canvas")).toBeVisible();
          await expect(page.getByRole("heading", { name: "MediMate+ 30 ngày" })).toBeVisible();
        }
        if (route.name === "nearby-clinic") {
          await expect(page.locator(".maplibregl-canvas")).toBeVisible();
          await expect(page.getByText("Bệnh viện kiểm thử", { exact: true })).toBeVisible();
        }
        if (route.name === "admin-overview") {
          await expect(page.getByRole("heading", {
            name: "Thông tin cốt lõi của hệ thống",
          })).toBeVisible();
          await expect(page.getByRole("link", { name: "Mở trang Tài khoản" })).toContainText("128");
        }
        if (route.name === "admin-users") {
          await expect(page.getByRole("heading", {
            name: "Người dùng trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText("Nguyễn Minh Anh", { exact: true })).toBeVisible();
        }
        if (route.name === "doctor-register") {
          await expect(page.getByLabel("Email")).toHaveValue("doctor@example.com");
          await expect(page.getByLabel("Cơ sở y tế - khoa")).toBeEnabled();
        }
        if (route.name === "medical-assistant") {
          await expect(page.getByRole("heading", {
            name: "Làm rõ triệu chứng trước khi đi khám",
          })).toBeVisible();
          await expect(page.getByRole("button", {
            name: "Bắt đầu mô tả triệu chứng",
          })).toBeVisible();
        }
        if (route.name === "profile-setup") {
          await expect(page.locator("#patient-profile-displayName")).toHaveValue("Nguyễn Minh");
          await expect(page.getByRole("button", { name: "Hoàn tất hồ sơ" })).toBeEnabled();
        }
        if (route.name === "symptom-analysis") {
          await expect(page.locator("#clinical-user-input")).toBeVisible();
          await expect(page.getByRole("button", { name: "Tiếp tục phân tích lâm sàng" })).toBeDisabled();
        }
        if (route.name === "patient-chat") {
          await expect(page.getByRole("heading", { name: "Bạn đang cần tìm hiểu điều gì?" })).toBeVisible();
          await expect(page.getByLabel("Nội dung cần hỏi")).toBeVisible();
        }
        if (route.name === "patient-records") {
          await expect(page.getByRole("heading", { name: "Hồ sơ y tế chưa được mở trên MediMate" })).toBeVisible();
          await expect(page.getByText("Không có hồ sơ nào được tạo hoặc lưu từ màn hình này.")).toBeVisible();
        }
        if (route.name === "patient-profile") {
          await expect(page.locator("#profile-panel-info")).toBeVisible();
          await expect(page.getByRole("heading", { name: "Nguyễn Minh" })).toBeVisible();
        }
        if (route.name === "patient-recovery") {
          await expect(page.getByRole("heading", { name: "Kế hoạch phục hồi chưa được mở" })).toBeVisible();
          await expect(page.getByText("MediMate hiện chưa tạo, lưu hoặc theo dõi kế hoạch phục hồi cá nhân.")).toBeVisible();
        }
        if (route.name === "patient-medication") {
          await expect(page.getByRole("heading", { name: "Xem trước ảnh trước khi trao đổi với người có chuyên môn" })).toBeVisible();
          await expect(page.getByText("MediMate hiện chưa nhận diện thuốc hoặc kiểm tra tương tác từ ảnh.")).toBeVisible();
        }
        const routeLoading = page.locator("[data-route-loading]");
        if (await routeLoading.count()) {
          await routeLoading.waitFor({ state: "detached" });
        }

        await expect(page).toHaveScreenshot(`${route.name}-${viewport.name}.png`, {
          fullPage: true,
          stylePath: visualStyles,
          timeout: 15_000,
        });
      });
    }
  }
});
