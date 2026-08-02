import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

function medication(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    medicineName: "Amoxicillin 500mg",
    dosageInstruction: "Uống sau ăn theo hướng dẫn đã nhận.",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    status: "active",
    sourceType: "patientReported",
    isReminderEnabled: true,
    reminderTimes: [{ id: "time-1", timeOfDay: "08:00:00", isActive: true }],
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: null,
    ...overrides,
  };
}

async function prepareMedicationPage(page, initialMedications = [medication()]) {
  await preparePage(page);
  await page.addInitScript(({ accessToken, userId }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId,
      roles: ["Patient"],
      isProfileCompleted: true,
    }));
  }, { accessToken: ACCESS_TOKEN, userId: USER_ID });

  let items = [...initialMedications];
  const calls = { created: null, updated: null, reminder: null, deleted: null };

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const path = url.pathname;

    if (path === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { id: USER_ID, displayName: "Nguyễn Minh", roles: ["Patient"] } }),
      });
    }

    if (path === "/api/user-medications" && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: items }) });
    }

    if (path === "/api/user-medications" && method === "POST") {
      calls.created = route.request().postDataJSON();
      const created = medication({
        id: "22222222-2222-4222-8222-222222222222",
        ...calls.created,
        reminderTimes: calls.created.reminderTimes.map((time, index) => ({ id: `new-${index}`, timeOfDay: time, isActive: true })),
      });
      items = [...items, created];
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true, data: created }) });
    }

    const remindersMatch = path.match(/^\/api\/user-medications\/([^/]+)\/reminders$/);
    if (remindersMatch && method === "PUT") {
      calls.reminder = route.request().postDataJSON();
      const target = items.find((item) => item.id === remindersMatch[1]);
      const updated = { ...target, isReminderEnabled: calls.reminder.isReminderEnabled };
      items = items.map((item) => item.id === updated.id ? updated : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: updated }) });
    }

    const detailMatch = path.match(/^\/api\/user-medications\/([^/]+)$/);
    if (detailMatch && method === "GET") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: items.find((item) => item.id === detailMatch[1]) }) });
    }
    if (detailMatch && method === "PUT") {
      calls.updated = route.request().postDataJSON();
      const updated = medication({ id: detailMatch[1], ...calls.updated });
      items = items.map((item) => item.id === detailMatch[1] ? updated : item);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: updated }) });
    }
    if (detailMatch && method === "DELETE") {
      calls.deleted = detailMatch[1];
      items = items.filter((item) => item.id !== detailMatch[1]);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: null }) });
    }

    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  await page.goto("/medication", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Thuốc và lịch nhắc của bạn" })).toBeVisible();
  return calls;
}

test("user creates a patient-reported medication with minute reminders", async ({ page }) => {
  const calls = await prepareMedicationPage(page);

  await page.getByRole("button", { name: "Thêm thuốc", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Thêm thuốc đang sử dụng" });
  await dialog.getByLabel(/Tên thuốc/).fill("Paracetamol 500mg");
  await dialog.getByLabel("Hướng dẫn sử dụng").fill("Uống khi cần theo hướng dẫn đã nhận.");
  await dialog.getByLabel(/Ngày bắt đầu/).fill("2026-08-02");
  await dialog.getByLabel(/Ngày kết thúc/).fill("2026-08-05");
  await dialog.getByLabel("Bật nhắc thuốc").check();
  await dialog.getByLabel("Giờ nhắc 1", { exact: true }).fill("09:30");
  await dialog.getByRole("button", { name: "Thêm thuốc", exact: true }).click();

  await expect(page.getByText("Paracetamol 500mg", { exact: true }).first()).toBeVisible();
  expect(calls.created).toEqual({
    medicineName: "Paracetamol 500mg",
    dosageInstruction: "Uống khi cần theo hướng dẫn đã nhận.",
    startDate: "2026-08-02",
    endDate: "2026-08-05",
    isReminderEnabled: true,
    reminderTimes: ["09:30:00"],
  });
});

test("medication form rejects duplicate reminder times and keeps input", async ({ page }) => {
  await prepareMedicationPage(page, []);
  const addMedicationButton = page.getByRole("button", { name: "Thêm thuốc đầu tiên" });
  const primaryButtonStyle = await addMedicationButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundImage: style.backgroundImage,
      boxShadow: style.boxShadow,
      color: style.color,
      height: element.getBoundingClientRect().height,
    };
  });
  expect(primaryButtonStyle.backgroundImage).toContain("linear-gradient");
  expect(primaryButtonStyle.boxShadow).not.toContain("3px 3px");
  expect(primaryButtonStyle.color).toBe("rgb(255, 255, 255)");
  expect(primaryButtonStyle.height).toBeGreaterThanOrEqual(44);

  await addMedicationButton.click();
  const dialog = page.getByRole("dialog", { name: "Thêm thuốc đang sử dụng" });
  await dialog.getByLabel(/Tên thuốc/).fill("Vitamin C");
  await dialog.getByLabel(/Ngày bắt đầu/).fill("2026-08-02");
  await dialog.getByLabel(/Ngày kết thúc/).fill("2026-08-05");
  await dialog.getByLabel("Bật nhắc thuốc").check();
  await dialog.getByRole("button", { name: "Thêm giờ" }).click();
  await dialog.getByLabel("Giờ nhắc 1", { exact: true }).fill("08:00");
  await dialog.getByLabel("Giờ nhắc 2", { exact: true }).fill("08:00");
  await dialog.getByRole("button", { name: "Thêm thuốc", exact: true }).click();

  await expect(dialog.getByRole("alert")).toContainText("Các giờ nhắc không được trùng nhau");
  await expect(dialog.getByLabel(/Tên thuốc/)).toHaveValue("Vitamin C");
});

test("user can disable reminders without deleting medication", async ({ page }) => {
  const calls = await prepareMedicationPage(page);
  await page.getByRole("button", { name: "Tắt lịch nhắc" }).click();

  await expect(page.getByText("Lịch nhắc đang tắt")).toBeVisible();
  expect(calls.reminder).toEqual({ isReminderEnabled: false, reminderTimes: ["08:00:00"] });
});

test("medication page remains accessible on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareMedicationPage(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
