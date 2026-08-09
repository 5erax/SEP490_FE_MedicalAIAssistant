import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const USER_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJVc2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIn0",
  "",
].join(".");
const ADMIN_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJBZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20ifQ",
  "",
].join(".");
const MAP_STYLE = {
  version: 8,
  name: "Accessibility test map",
  sources: {},
  layers: [],
};
const FACILITY = {
  id: "11111111-1111-4111-8111-111111111111",
  facilityName: "Test Hospital",
  address: "123 Test Street",
  latitude: 10.77,
  longitude: 106.69,
  phone: "0123456789",
  facilityType: "Hospital",
  imageUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  departments: [],
};

async function addAuth(page, accessToken, roles) {
  await page.addInitScript(({ token, authRoles }) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken: token,
      roles: authRoles,
      isFirstLogin: false,
      isProfileCompleted: true,
    }));
  }, { token: accessToken, authRoles: roles });
}

async function expectNoSeriousAxeViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const seriousViolations = results.violations
    .filter((violation) => ["critical", "serious"].includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));

  expect(seriousViolations).toEqual([]);
}

test("signup exposes one main landmark and a visible h1 on mobile", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/signup", { waitUntil: "domcontentloaded" });

  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("h1.auth-card-title")).toBeVisible();

  const submit = page.locator("button[type='submit']");
  expect((await submit.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expectNoSeriousAxeViolations(page);
});

test("diagnosis result keeps one main and exposes a semantic ranking", async ({ page }) => {
  await preparePage(page);
  await addAuth(page, USER_TOKEN, ["User"]);
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            displayName: "Patient Test",
            roles: ["Patient"],
            isFirstLogin: false,
            isProfileCompleted: true,
          },
        }),
      });
    }
    if (pathname === "/api/symptom-analysis/accessibility-session") {
      const diagnoses = [
        { rank: 1, diseaseName: "Condition A", icd10Code: "A01", paGivenB: 0.72 },
        { rank: 2, diseaseName: "Condition B", icd10Code: "B02", paGivenB: 0.28 },
      ];
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sessionId: "accessibility-session",
            analysis: {
              diagnoses,
              primaryDiagnosis: diagnoses[0],
              recommendedDepartment: { departmentName: "Internal Medicine" },
            },
          },
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/assessment/accessibility-session/result", { waitUntil: "domcontentloaded" });

  await expect(page.locator("main")).toHaveCount(1);
  const ranking = page.locator("ol.diagnosis-bar-chart");
  await expect(ranking).toBeVisible();
  await expect(ranking.locator("li")).toHaveCount(2);
  await expect(ranking.locator("li").first()).toContainText("Condition A");
  await expectNoSeriousAxeViolations(page);
});

test("closing a map popup restores focus and detail images reserve space", async ({ page }) => {
  await preparePage(page);
  await page.route("https://basemaps.cartocdn.com/**", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify(MAP_STYLE),
  }));
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/medical-facilities/active") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [FACILITY] }),
      });
    }
    if (pathname === `/api/medical-facilities/${FACILITY.id}`) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: FACILITY }),
      });
    }
    if (pathname.startsWith("/api/feedback-reviews/facility/")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { items: [], pageNumber: 1, pageSize: 20, totalCount: 0, totalPages: 0 },
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  const marker = page.locator(".clinic-marker");
  await expect(marker).toBeVisible();
  await marker.focus();
  await marker.press("Enter");
  await expect(page.locator(".popup-card")).toBeVisible();
  await expect(page.locator(".popup-card button")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".popup-card")).toHaveCount(0);
  await expect(marker).toBeFocused();

  await page.locator(".facility-select-button").click();
  const image = page.locator(".facility-detail-media img");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("width", "640");
  await expect(image).toHaveAttribute("height", "360");
  await expect(image).toHaveAttribute("loading", "lazy");
});

test("admin focus remains visible in forced-colors mode", async ({ page }) => {
  await preparePage(page);
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await addAuth(page, ADMIN_TOKEN, ["Admin"]);
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { name: "Admin Test", roles: ["Admin"] } }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 },
      }),
    });
  });

  await page.goto("/app/admin", { waitUntil: "domcontentloaded" });

  await expect(page.locator("main")).toHaveCount(1);
  const usersLink = page.locator('a[href="/app/admin/users"]').first();
  await usersLink.focus();
  await expect(usersLink).toBeFocused();
  const focusStyle = await usersLink.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      outlineStyle: styles.outlineStyle,
      outlineWidth: Number.parseFloat(styles.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(3);

  const visibleButton = page.locator("button:visible").first();
  expect((await visibleButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
});

test("public content remains usable at 200 percent page zoom", async ({ page }) => {
  await preparePage(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  const devtools = await page.context().newCDPSession(page);
  await devtools.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });

  await page.goto("/signup", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1.auth-card-title")).toBeVisible();
  await expect(page.locator("button[type='submit']")).toBeVisible();
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

  await devtools.detach();
});
