import { expect, test } from "@playwright/test";
import { APP_ROUTES, KNOWN_ROUTE_CONFLICTS, STATIC_ROUTES } from "./route-manifest.js";
import { openRoute, pathname, preparePage } from "./helpers.js";

const TOKENS = {
  patient: [
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
    "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50In0",
    "",
  ].join("."),
  staff: [
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
    "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJTdGFmZiJ9",
    "",
  ].join("."),
  admin: [
    "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
    "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiJ9",
    "",
  ].join("."),
};

async function setAuth(page, auth) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate((storedAuth) => {
    localStorage.setItem("medimate.auth", JSON.stringify(storedAuth));
  }, auth);
}

test.describe("route baseline", () => {
  for (const route of APP_ROUTES) {
    test(`${route.path} renders ${route.surface}`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await preparePage(page);
      await openRoute(page, route.path);

      await expect.poll(() => pathname(page)).toBe(route.expectedPath);
      expect(pageErrors).toEqual([]);
    });
  }

  for (const path of STATIC_ROUTES) {
    test(`${path} renders static content`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await preparePage(page);
      await openRoute(page, path);

      expect(pathname(page)).toBe(path);
      expect(pageErrors).toEqual([]);
    });
  }

  for (const conflict of KNOWN_ROUTE_CONFLICTS) {
    test.fixme(`${conflict.path} has a known route conflict`, async () => {
      expect(conflict.reason).toBeTruthy();
    });
  }

  test("authenticated route guards enforce role and premium access", async ({ page }) => {
    await preparePage(page);

    await setAuth(page, {
      accessToken: TOKENS.patient,
      roles: ["Patient"],
    });
    await openRoute(page, "/app/admin");
    await expect.poll(() => pathname(page)).toBe("/dashboard");
    await openRoute(page, "/chat");
    await expect.poll(() => pathname(page)).toBe("/pricing");

    await setAuth(page, {
      accessToken: TOKENS.patient,
      hasPremiumAccess: true,
      roles: ["Patient"],
    });
    await openRoute(page, "/chat");
    await expect.poll(() => pathname(page)).toBe("/chat");

    await setAuth(page, {
      accessToken: TOKENS.staff,
      roles: ["Staff"],
    });
    await openRoute(page, "/app/admin");
    await expect.poll(() => pathname(page)).toBe("/app/staff");

    await setAuth(page, {
      accessToken: TOKENS.admin,
      roles: ["Admin"],
    });
    await openRoute(page, "/app/admin/users");
    await expect.poll(() => pathname(page)).toBe("/app/admin/users");
  });
});
