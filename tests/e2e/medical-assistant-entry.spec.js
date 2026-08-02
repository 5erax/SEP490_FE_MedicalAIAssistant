import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");

test("landing symptom CTA sends guests through login and preserves the clinical return path", async ({ page }) => {
  await preparePage(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const primaryAction = page.getByRole("link", { name: "Phân tích triệu chứng", exact: true }).first();
  await expect(primaryAction).toHaveAttribute("href", "/symptom");
  await primaryAction.click();

  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/symptom");
  await expect(page.getByRole("link", { name: "Tạo tài khoản miễn phí" })).toHaveAttribute("href", "/signup?returnTo=%2Fsymptom");
});

test("legacy medical assistant links use the same authentication gate", async ({ page }) => {
  await preparePage(page);
  await page.goto("/medical-assistant", { waitUntil: "domcontentloaded" });

  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/symptom");
});

test("authenticated users reach the real clinical intake from the legacy route", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      email: "patient@example.com",
      roles: ["Patient"],
    }));
  }, PATIENT_TOKEN);

  await page.goto("/medical-assistant", { waitUntil: "domcontentloaded" });

  await expect.poll(() => new URL(page.url()).pathname).toBe("/symptom");
  await expect(page.getByRole("heading", { name: "Phân tích lâm sàng qua triệu chứng" })).toBeVisible();
  await expect(page.locator("#clinical-user-input")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include(".assessment-page")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => violation.id);
  expect(seriousViolations).toEqual([]);
});
