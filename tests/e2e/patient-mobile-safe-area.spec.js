import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const PATIENT_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwidXNlcklkIjoiNTU1NTU1NTUtNTU1NS00NTU1LTg1NTUtNTU1NTU1NTU1NTU1In0",
  "",
].join(".");

const VIEWPORTS = [
  { name: "small mobile", width: 320, height: 800 },
  { name: "large mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
];

const PATIENT_SURFACES = [
  {
    path: "/dashboard",
    focusTarget: ".studio-chatbox textarea",
    primaryAction: ".studio-submit-icon",
  },
  {
    path: "/symptom",
    focusTarget: "#clinical-user-input",
    primaryAction: ".clinical-submit-row button",
  },
  {
    path: "/chat",
    focusTarget: "#chatbot-message-input",
    primaryAction: ".chatbot-send-button",
  },
  {
    path: "/profile",
    focusTarget: "#profile-panel-info .profile-head button",
    primaryAction: "#profile-panel-info .profile-head button",
  },
  {
    path: "/records",
    focusTarget: ".records-actions button",
    primaryAction: ".records-actions button",
  },
  {
    path: "/recovery-plan",
    focusTarget: ".recovery-create-card select",
    primaryAction: ".recovery-create-card button[type=\"submit\"]",
  },
  {
    path: "/medication",
    focusTarget: ".medication-page-header .ui-button",
    primaryAction: ".medication-page-header .ui-button",
  },
];

function rectanglesOverlap(first, second) {
  return !(
    first.x + first.width <= second.x
    || second.x + second.width <= first.x
    || first.y + first.height <= second.y
    || second.y + second.height <= first.y
  );
}

async function preparePatientWorkspace(page) {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      displayName: "Nguyễn Minh",
      roles: ["Patient"],
      isPremium: true,
      firstLogin: false,
      isProfileCompleted: true,
    }));
  }, PATIENT_TOKEN);

  await page.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/users/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "55555555-5555-4555-8555-555555555555",
            displayName: "Nguyễn Minh",
            email: "patient@example.com",
            roles: ["Patient"],
            isProfileCompleted: true,
          },
        }),
      });
    }
    if (pathname === "/api/patient-profiles") {
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
    if (pathname === "/api/me/subscription-usage") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            quotaCode: "recoveryPlan",
            quotaName: "Kế hoạch phục hồi",
            limitValue: 3,
            usedCount: 0,
            reservedCount: 0,
            remainingCount: 3,
            cycleStart: "2026-08-01",
            cycleEnd: "2026-08-31",
            resetPeriod: "subscriptionCycle",
          },
        }),
      });
    }
    if (pathname === "/api/recovery-plan-requests/me" || pathname === "/api/recovery-plans/me") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { items: [], pageNumber: 1, pageSize: 10, totalCount: 0, totalPages: 1 } }),
      });
    }
    if (pathname === "/api/user-medications") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
    }

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

for (const viewport of VIEWPORTS) {
  test(`patient controls preserve a safe mobile viewport at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await preparePatientWorkspace(page);

    for (const surface of PATIENT_SURFACES) {
      await test.step(surface.path, async () => {
        await openRoute(page, surface.path);

        const shell = page.locator(".user-shell");
        const navigation = page.getByRole("navigation", { name: "Điều hướng nhanh" });
        const helpButton = page.getByRole("button", { name: "Mở hướng dẫn sử dụng" });
        const focusTarget = page.locator(surface.focusTarget).first();
        const primaryAction = page.locator(surface.primaryAction).first();

        await expect(shell).toBeVisible();
        await expect(navigation).toBeVisible();
        await expect(helpButton).toBeVisible();
        await expect(focusTarget).toBeVisible();

        const [navigationBox, helpBox, primaryActionBox] = await Promise.all([
          navigation.boundingBox(),
          helpButton.boundingBox(),
          primaryAction.boundingBox(),
        ]);

        expect(navigationBox).not.toBeNull();
        expect(helpBox).not.toBeNull();
        expect(primaryActionBox).not.toBeNull();
        expect(primaryActionBox.height).toBeGreaterThanOrEqual(44);

        for (const navigationItem of await navigation.locator("a, button").all()) {
          const itemBox = await navigationItem.boundingBox();
          expect(itemBox).not.toBeNull();
          expect(rectanglesOverlap(itemBox, helpBox)).toBe(false);
        }

        await focusTarget.focus();
        await expect(focusTarget).toBeFocused();

        const [focusedBox, topbarBox] = await Promise.all([
          focusTarget.boundingBox(),
          page.locator(".user-shell-topbar").boundingBox(),
        ]);

        expect(focusedBox).not.toBeNull();
        expect(topbarBox).not.toBeNull();
        expect(focusedBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height);
        expect(rectanglesOverlap(focusedBox, navigationBox)).toBe(false);
        expect(rectanglesOverlap(focusedBox, helpBox)).toBe(false);

        const layout = await page.evaluate(() => {
          const shellElement = document.querySelector(".user-shell");
          const contentElement = document.querySelector(".user-shell-content");
          const shellStyle = getComputedStyle(shellElement);
          const contentStyle = getComputedStyle(contentElement);
          return {
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
            safeBottom: shellStyle.getPropertyValue("--patient-safe-bottom").trim(),
            contentPaddingBottom: Number.parseFloat(contentStyle.paddingBottom),
          };
        });

        expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
        expect(layout.safeBottom).not.toBe("");
        expect(layout.contentPaddingBottom).toBeGreaterThanOrEqual(
          navigationBox.height + Math.max(0, viewport.height - navigationBox.y - navigationBox.height),
        );
      });
    }
  });
}
