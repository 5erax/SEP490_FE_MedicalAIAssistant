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
        if (["admin-overview", "admin-users", "admin-doctors", "admin-ai-configs", "admin-facilities", "admin-departments", "admin-icd-chapters", "admin-clinical-questions", "admin-patient-profiles"].includes(route.name)) {
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
          const visualAdminDoctors = route.name === "admin-doctors"
            ? [
              {
                id: "doctor-visual-01",
                fullName: "BS.CKI Nguyễn Minh Anh",
                academicTitle: "Bác sĩ chuyên khoa I",
                departmentName: "Khoa Tim mạch",
                departmentRoleName: "Bác sĩ",
                facilityName: "Bệnh viện Đa khoa Trung tâm",
                yearsOfExperience: 9,
                isActive: true,
              },
              {
                id: "doctor-visual-02",
                fullName: "ThS.BS Trần Hoàng Nam",
                academicTitle: "Thạc sĩ, Bác sĩ",
                departmentName: "Khoa Nội tổng quát",
                departmentRoleName: "Phó trưởng khoa",
                facilityName: "Bệnh viện Thành phố",
                yearsOfExperience: 14,
                isActive: true,
              },
              {
                id: "doctor-visual-03",
                fullName: "BS Lê Thu Hà",
                academicTitle: "Bác sĩ",
                departmentName: "Khoa Nhi",
                departmentRoleName: "Bác sĩ",
                facilityName: "Bệnh viện Nhi đồng",
                yearsOfExperience: 6,
                isActive: false,
              },
            ]
            : [];
          const visualAdminAIConfigs = route.name === "admin-ai-configs"
            ? [
              {
                id: "ai-config-visual-01",
                taskType: "symptom-analysis-prod",
                systemPrompt: "Hỗ trợ làm rõ triệu chứng, nêu giới hạn y tế và khuyến nghị gặp người có chuyên môn khi cần.",
                model: "medimate-clinical-v2",
                temperature: 0.2,
                maxTokens: 1200,
                isActive: true,
                updatedAt: "2026-07-23T08:30:00Z",
              },
              {
                id: "ai-config-visual-02",
                taskType: "consultation-questions",
                systemPrompt: "Tạo câu hỏi ngắn gọn để người dùng chuẩn bị thông tin trước khi trao đổi với bác sĩ.",
                model: "medimate-consult-v1",
                temperature: 0.3,
                maxTokens: 900,
                isActive: true,
                updatedAt: "2026-07-22T09:45:00Z",
              },
              {
                id: "ai-config-visual-03",
                taskType: "specialty-suggestion-stage",
                systemPrompt: "Tổng hợp thông tin đã cung cấp và đưa ra gợi ý chuyên khoa mang tính tham khảo.",
                model: "medimate-routing-v1",
                temperature: null,
                maxTokens: null,
                isActive: false,
                createdAt: "2026-07-21T10:15:00Z",
              },
            ]
            : [];
          const visualAdminFacilities = route.name === "admin-facilities"
            ? [
              {
                id: "facility-visual-01",
                facilityName: "Bệnh viện Đa khoa Trung tâm",
                address: "125 Nguyễn Chí Thanh, Quận 5, TP.HCM",
                latitude: 10.75852,
                longitude: 106.66187,
                facilityType: "Bệnh viện",
                isActive: true,
              },
              {
                id: "facility-visual-02",
                facilityName: "Phòng khám Chuyên khoa An Bình",
                address: "42 Hai Bà Trưng, Quận 1, TP.HCM",
                latitude: null,
                longitude: null,
                facilityType: "Phòng khám chuyên khoa",
                isActive: true,
                departments: [{ departmentName: "Khoa Nội tổng quát" }],
              },
              {
                id: "facility-visual-03",
                facilityName: "Trung tâm Y tế Thành phố",
                address: "18 Lý Thường Kiệt, Quận 10, TP.HCM",
                latitude: 10.77211,
                longitude: 106.66789,
                facilityType: "Trung tâm y tế",
                isActive: false,
                departments: [{ departmentName: "Khoa Nhi" }],
              },
            ]
            : [];
          const visualAdminDepartments = route.name === "admin-departments"
            ? [
              {
                id: "department-visual-cardiology",
                departmentName: "Khoa Tim mạch",
                description: "Tiếp nhận và theo dõi các vấn đề liên quan đến tim và hệ tuần hoàn.",
                chapterCode: "IX",
              },
              {
                id: "department-visual-internal-medicine",
                departmentName: "Khoa Nội tổng quát",
                description: "Đánh giá ban đầu các vấn đề sức khỏe thường gặp ở người trưởng thành.",
                chapterCode: "XVIII",
              },
              {
                id: "department-visual-pediatrics",
                departmentName: "Khoa Nhi",
                description: "Chăm sóc sức khỏe và theo dõi các vấn đề thường gặp ở trẻ em.",
                chapterCode: "XVI",
              },
            ]
            : [];
          const visualAdminIcdChapters = ["admin-icd-chapters", "admin-clinical-questions"].includes(route.name)
            ? [
              {
                id: "icd-visual-circulatory",
                chapterCode: "IX",
                chapterName: "Bệnh hệ tuần hoàn",
                keywordWeights: { "đau ngực": 5, "khó thở": 4, "hồi hộp": 3 },
              },
              {
                id: "icd-visual-respiratory",
                chapterCode: "X",
                chapterName: "Bệnh hệ hô hấp",
                keywordWeights: { ho: 5, "khò khè": 4, "đau họng": 2 },
              },
              {
                id: "icd-visual-symptoms",
                chapterCode: "XVIII",
                chapterName: "Triệu chứng, dấu hiệu và phát hiện lâm sàng",
                keywordWeights: { "mệt mỏi": 4, "chóng mặt": 3, "đau đầu": 3, sốt: 2, "khó chịu": 1 },
              },
            ]
            : [];
          const visualAdminClinicalQuestions = route.name === "admin-clinical-questions"
            ? [
              {
                id: "clinical-question-visual-01",
                chapterId: "icd-visual-circulatory",
                chapterCode: "IX",
                questionVi: "Bạn có cảm thấy đau ngực hoặc khó thở khi vận động không?",
                englishPrefix: "Do you experience chest pain or shortness of breath during activity?",
                sortOrder: 1,
                answers: { Có: "Yes", Không: "No" },
                createdAt: "2026-07-21T08:30:00Z",
              },
              {
                id: "clinical-question-visual-02",
                chapterId: "icd-visual-respiratory",
                chapterCode: "X",
                questionVi: "Bạn có ho kéo dài hoặc nghe tiếng khò khè khi thở không?",
                englishPrefix: "Do you have a persistent cough or wheezing?",
                sortOrder: 2,
                answers: { Có: "Yes", Không: "No", "Không chắc": "Not sure" },
                createdAt: "2026-07-22T09:45:00Z",
              },
              {
                id: "clinical-question-visual-03",
                chapterId: "icd-visual-symptoms",
                chapterCode: "XVIII",
                questionVi: "Triệu chứng hiện tại ảnh hưởng đến sinh hoạt hằng ngày ở mức nào?",
                englishPrefix: "How much do your current symptoms affect daily activities?",
                sortOrder: 3,
                answers: { Nhẹ: "Mild", Vừa: "Moderate", Nặng: "Severe" },
                createdAt: "2026-07-23T10:15:00Z",
              },
            ]
            : [];
          const visualAdminPatientProfiles = route.name === "admin-patient-profiles"
            ? [
              {
                id: "profile-visual-01",
                userId: "user-visual-patient-01",
                userDisplayName: "Nguyễn Minh An",
                bloodType: "A+",
                height: 168,
                weight: 58,
                allergyNote: "Dị ứng hải sản",
                chronicDiseases: [],
                isProfileCompleted: true,
                isDeleted: false,
                updatedAt: "2026-07-23T08:30:00Z",
              },
              {
                id: "profile-visual-02",
                userId: "user-visual-patient-02",
                userDisplayName: "Trần Hoàng Nam",
                bloodType: "O+",
                height: 174,
                weight: 70,
                allergyNote: null,
                chronicDiseases: [{ diseaseName: "Tăng huyết áp" }],
                isProfileCompleted: true,
                isDeleted: false,
                updatedAt: "2026-07-22T09:45:00Z",
              },
              {
                id: "profile-visual-03",
                userId: "user-visual-patient-03",
                userDisplayName: "Lê Thu Hà",
                bloodType: null,
                height: null,
                weight: null,
                allergyNote: null,
                chronicDiseases: [],
                isProfileCompleted: false,
                isDeleted: false,
                createdAt: "2026-07-21T10:15:00Z",
              },
            ]
            : [];
          await page.route("**/api/**", (request) => {
            const url = new URL(request.request().url());
            const pathname = url.pathname;
            if (pathname === "/api/users/me") {
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: { name: "Quản trị MediMate", roles: ["Admin"] },
                }),
              });
            }
            if (pathname === "/api/facility-departments/active") {
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: route.name === "admin-facilities"
                    ? [{
                      id: "33333333-3333-4333-8333-333333333333",
                      facilityId: "facility-visual-01",
                      facilityName: "Bệnh viện Đa khoa Trung tâm",
                      departmentId: "22222222-2222-4222-8222-222222222222",
                      departmentName: "Khoa Tim mạch",
                    }]
                    : [{
                      id: "33333333-3333-4333-8333-333333333333",
                      facilityId: "11111111-1111-4111-8111-111111111111",
                      facilityName: "Bệnh viện Đa khoa Trung tâm",
                      departmentId: "22222222-2222-4222-8222-222222222222",
                      departmentName: "Khoa Tim mạch",
                    }],
                }),
              });
            }
            if (pathname === "/api/medical-departments") {
              const isPagedRequest = url.searchParams.has("PageNumber");
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: isPagedRequest
                    ? {
                      items: visualAdminDepartments,
                      pageNumber: 1,
                      pageSize: 10,
                      totalCount: visualAdminDepartments.length,
                      totalPages: 1,
                    }
                    : visualAdminDepartments,
                }),
              });
            }
            if (pathname === "/api/icd-chapters") {
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: {
                    items: visualAdminIcdChapters,
                    pageNumber: 1,
                    pageSize: 10,
                    totalCount: visualAdminIcdChapters.length,
                    totalPages: 1,
                  },
                }),
              });
            }
            if (pathname === "/api/clinical-questions") {
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: {
                    items: visualAdminClinicalQuestions,
                    pageNumber: 1,
                    pageSize: 10,
                    totalCount: visualAdminClinicalQuestions.length,
                    totalPages: 1,
                  },
                }),
              });
            }
            if (pathname === "/api/patient-profiles") {
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: {
                    items: visualAdminPatientProfiles,
                    pageNumber: 1,
                    pageSize: 10,
                    totalCount: visualAdminPatientProfiles.length,
                    totalPages: 1,
                  },
                }),
              });
            }
            if (Object.hasOwn(adminTotals, pathname)) {
              const items = pathname === "/api/users"
                ? visualAdminUsers
                : pathname === "/api/doctors"
                  ? visualAdminDoctors
                  : pathname === "/api/ai-configs"
                    ? visualAdminAIConfigs
                  : pathname === "/api/medical-facilities"
                    ? visualAdminFacilities
                    : [];
              return request.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                  success: true,
                  data: {
                    items,
                    pageNumber: 1,
                    pageSize: 10,
                    totalCount: items.length || adminTotals[pathname],
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
        if (route.name === "admin-doctors") {
          await expect(page.getByRole("heading", {
            name: "Bác sĩ trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText(
            "3 đang hiển thị · 3 hồ sơ phù hợp",
            { exact: true },
          )).toBeVisible();
        }
        if (route.name === "admin-ai-configs") {
          await expect(page.getByRole("heading", {
            name: "Cấu hình AI trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText(
            "3 cấu hình đang hiển thị",
            { exact: true },
          )).toBeVisible();
          await expect(
            page.getByRole("list", { name: "Danh sách cấu hình AI" })
              .getByText("symptom-analysis-prod", { exact: true }),
          ).toBeVisible();
        }
        if (route.name === "admin-facilities") {
          await expect(page.getByRole("heading", {
            name: "Cơ sở y tế trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText(
            "3 cơ sở đang hiển thị",
            { exact: true },
          )).toBeVisible();
          await expect(page.getByRole("link", {
            name: "Xem Bệnh viện Đa khoa Trung tâm trên OpenStreetMap",
          })).toBeVisible();
          await expect(
            page.locator(".facility-admin-card")
              .filter({ hasText: "Phòng khám Chuyên khoa An Bình" })
              .getByRole("link"),
          ).toHaveCount(0);
        }
        if (route.name === "admin-departments") {
          await expect(page.getByRole("heading", {
            name: "Chuyên khoa trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText(
            "3 chuyên khoa đang hiển thị",
            { exact: true },
          )).toBeVisible();
          await expect(page.getByText("Khoa Tim mạch", { exact: true })).toBeVisible();
        }
        if (route.name === "admin-icd-chapters") {
          await expect(page.getByRole("heading", {
            name: "Chương ICD trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText(
            "3 chương ICD đang hiển thị",
            { exact: true },
          )).toBeVisible();
          await expect(page.getByText("Bệnh hệ tuần hoàn", { exact: true })).toBeVisible();
        }
        if (route.name === "admin-clinical-questions") {
          await expect(page.getByRole("heading", {
            name: "Câu hỏi lâm sàng trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText(
            "3 câu hỏi đang hiển thị",
            { exact: true },
          )).toBeVisible();
          await expect(page.getByText(
            "Bạn có cảm thấy đau ngực hoặc khó thở khi vận động không?",
            { exact: true },
          )).toBeVisible();
        }
        if (route.name === "admin-patient-profiles") {
          await expect(page.getByRole("heading", {
            name: "Hồ sơ bệnh nhân trong hệ thống",
          })).toBeVisible();
          await expect(page.getByText(
            "3 hồ sơ đang hiển thị",
            { exact: true },
          )).toBeVisible();
          await expect(page.getByText("Nguyễn Minh An", { exact: true })).toBeVisible();
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
