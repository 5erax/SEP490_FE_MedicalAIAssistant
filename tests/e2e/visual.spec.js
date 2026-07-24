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

test.describe("visual baseline", () => {
  for (const route of VISUAL_ROUTES) {
    for (const viewport of VISUAL_VIEWPORTS) {
      test(`${route.name} at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await preparePage(page);
        if (["profile-setup", "patient-dashboard", "symptom-analysis", "patient-chat", "patient-records", "patient-profile", "patient-recovery"].includes(route.name)) {
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
        if (route.name === "doctor-register") {
          await expect(page.getByLabel("Email")).toHaveValue("doctor@example.com");
          await expect(page.getByLabel("Cơ sở y tế - khoa")).toBeEnabled();
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
