import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const createAccessToken = (expiresInSeconds) => {
  const header = globalThis.Buffer.from(
    JSON.stringify({ alg: "none", typ: "JWT" }),
  ).toString("base64url");
  const payload = globalThis.Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
      role: "Patient",
    }),
  ).toString("base64url");

  return `${header}.${payload}.`;
};

const EXPIRED_ACCESS_TOKEN = createAccessToken(-60);
const NEAR_EXPIRY_ACCESS_TOKEN = createAccessToken(60);
const VALID_ACCESS_TOKEN = createAccessToken(60 * 60);
const REFRESHED_ACCESS_TOKEN = createAccessToken(2 * 60 * 60);

async function storePatientAuth(page, accessToken) {
  await page.addInitScript((token) => {
    localStorage.setItem(
      "medimate.auth",
      JSON.stringify({
        accessToken: token,
        userId: "55555555-5555-4555-8555-555555555555",
        roles: ["Patient"],
      }),
    );
  }, accessToken);
}

function jsonResponse(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

test.describe("global auth session", () => {
  for (const failure of ["network", 502, 429, "malformed"]) {
    test(`keeps a valid session after transient refresh failure: ${failure}`, async ({ page }) => {
      await preparePage(page);
      await storePatientAuth(page, NEAR_EXPIRY_ACCESS_TOKEN);
      let calls = 0;
      await page.route("**/api/**", async (route) => {
        if (!new URL(route.request().url()).pathname.endsWith("/authentication/refresh")) {
          return route.fulfill(jsonResponse({ success: true, data: [] }));
        }
        calls += 1;
        if (calls > 1) return route.fulfill(jsonResponse({ success: true, data: { accessToken: REFRESHED_ACCESS_TOKEN } }));
        if (failure === "network") return route.abort("internetdisconnected");
        return route.fulfill(jsonResponse({ success: failure === "malformed" }, failure === "malformed" ? 200 : failure));
      });
      await page.goto("/records");
      expect(await page.evaluate(() => Boolean(localStorage.getItem("medimate.auth")))).toBe(true);
      await expect(page).toHaveURL(/\/records$/);
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("medimate.auth"))?.accessToken), { timeout: 12_000 }).toBe(REFRESHED_ACCESS_TOKEN);
      await expect(page.getByText("Kết nối đang gián đoạn")).toHaveCount(0);
      expect(calls).toBe(2);
    });
  }

  test("expired session waits for retry without redirecting to login", async ({ page }) => {
    await preparePage(page);
    await storePatientAuth(page, EXPIRED_ACCESS_TOKEN);
    let recovered = false;
    await page.route("**/api/**", (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/authentication/refresh")) {
        return route.fulfill(jsonResponse(recovered
          ? { success: true, data: { accessToken: REFRESHED_ACCESS_TOKEN } }
          : { success: false }, recovered ? 200 : 503));
      }
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    });
    await page.goto("/records");
    await expect(page.getByText("Chưa thể kết nối để khôi phục phiên đăng nhập")).toBeVisible();
    await expect(page).toHaveURL(/\/records$/);
    recovered = true;
    await page.getByRole("button", { name: "Thử lại ngay" }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("medimate.auth"))?.accessToken)).toBe(REFRESHED_ACCESS_TOKEN);
    await expect(page.getByRole("main", { name: "Khôi phục phiên đăng nhập" })).toHaveCount(0);
    await expect(page).toHaveURL(/\/records$/);
  });

  test("repeated failures back off and focus events do not flood refresh", async ({ page }) => {
    await preparePage(page);
    await storePatientAuth(page, NEAR_EXPIRY_ACCESS_TOKEN);
    await page.clock.install();
    let calls = 0;
    await page.route("**/api/authentication/refresh", (route) => {
      calls += 1;
      return route.fulfill(jsonResponse({ success: false }, 503));
    });
    await page.goto("/support");
    await expect(page.getByText("Kết nối đang gián đoạn")).toBeVisible();
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event("focus"));
        window.dispatchEvent(new Event("online"));
      }
    });
    expect(calls).toBe(1);
    await page.clock.runFor(5_000);
    await expect.poll(() => calls).toBe(2);
    await page.clock.runFor(1_000);
    expect(calls).toBe(2);
    expect(await page.evaluate(() => Boolean(localStorage.getItem("medimate.auth")))).toBe(true);
  });

  test("server revocation clears even a still-valid access token", async ({ page }) => {
    await preparePage(page);
    await storePatientAuth(page, NEAR_EXPIRY_ACCESS_TOKEN);
    await page.route("**/api/**", (route) => route.fulfill(jsonResponse({ success: false }, 403)));
    await page.goto("/records");
    await expect(page).toHaveURL(/\/login\?/);
    expect(await page.evaluate(() => localStorage.getItem("medimate.auth"))).toBeNull();
  });

  for (const action of ["logout", "new-login"]) {
    test(`late refresh cannot overwrite ${action}`, async ({ page }) => {
      await preparePage(page);
      await storePatientAuth(page, VALID_ACCESS_TOKEN);
      await page.goto("/support");
      let release;
      const gate = new Promise((resolve) => { release = resolve; });
      await page.route("**/api/authentication/refresh", async (route) => {
        await gate;
        await route.fulfill(jsonResponse({ success: true, data: { accessToken: REFRESHED_ACCESS_TOKEN } }));
      });
      const refreshRequest = page.waitForRequest("**/api/authentication/refresh");
      await page.evaluate(() => {
        window.__auditRefresh = import("/src/services/apiClient.js").then((client) => client.refreshAuthSession());
      });
      await refreshRequest;
      await page.evaluate(async (kind) => {
        const client = await import("/src/services/apiClient.js");
        if (kind === "logout") client.clearStoredAuth();
        else client.setStoredAuth({ accessToken: "new-login-token", roles: ["Patient"] });
      }, action);
      release();
      const token = await page.evaluate(async () => {
        await window.__auditRefresh;
        return JSON.parse(localStorage.getItem("medimate.auth"))?.accessToken ?? null;
      });
      expect(token).toBe(action === "logout" ? null : "new-login-token");
    });
  }

  test("refreshes an expired session before the route guard redirects", async ({ page }) => {
    await preparePage(page);
    await storePatientAuth(page, EXPIRED_ACCESS_TOKEN);
    await page.addInitScript(() => {
      const nativeFetch = window.fetch.bind(window);
      window.__refreshCredentials = [];
      window.fetch = (input, init) => {
        const url = input instanceof Request
          ? input.url
          : String(input);

        if (url.endsWith("/authentication/refresh")) {
          window.__refreshCredentials.push(
            init?.credentials,
          );
        }

        return nativeFetch(input, init);
      };
    });

    let refreshCalls = 0;

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());

      if (requestUrl.pathname.endsWith("/authentication/refresh")) {
        refreshCalls += 1;
        await route.fulfill(jsonResponse({
          success: true,
          data: {
            accessToken: REFRESHED_ACCESS_TOKEN,
          },
        }));
        return;
      }

      await route.fulfill(jsonResponse({ success: true, data: [] }));
    });

    await page.goto("/records", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/records$/);
    await expect.poll(() => refreshCalls).toBe(1);
    await expect.poll(() => page.evaluate(() => (
      window.__refreshCredentials
    ))).toEqual(["include"]);
    await expect.poll(() => page.evaluate(() => (
      JSON.parse(localStorage.getItem("medimate.auth"))?.accessToken
    ))).toBe(REFRESHED_ACCESS_TOKEN);
  });

  test("refreshes globally on a public page that makes no API calls", async ({ page }) => {
    await preparePage(page);
    await storePatientAuth(page, NEAR_EXPIRY_ACCESS_TOKEN);

    let refreshCalls = 0;

    await page.route("**/api/authentication/refresh", async (route) => {
      refreshCalls += 1;
      await route.fulfill(jsonResponse({
        success: true,
        data: {
          accessToken: REFRESHED_ACCESS_TOKEN,
        },
      }));
    });

    await page.goto("/support", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/support$/);
    await expect.poll(() => refreshCalls).toBe(1);
    await expect.poll(() => page.evaluate(() => (
      JSON.parse(localStorage.getItem("medimate.auth"))?.accessToken
    ))).toBe(REFRESHED_ACCESS_TOKEN);
  });

  test("refresh cannot reopen onboarding for a completed patient profile", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        userId: "55555555-5555-4555-8555-555555555555",
        roles: ["Patient"],
        isProfileCompleted: true,
      }));
    }, NEAR_EXPIRY_ACCESS_TOKEN);

    await page.route("**/api/authentication/refresh", (route) => route.fulfill(jsonResponse({
      success: true,
      data: {
        accessToken: REFRESHED_ACCESS_TOKEN,
        isProfileCompleted: false,
      },
    })));

    await page.goto("/support", { waitUntil: "domcontentloaded" });

    await expect.poll(() => page.evaluate(() => (
      JSON.parse(localStorage.getItem("medimate.auth"))?.accessToken
    ))).toBe(REFRESHED_ACCESS_TOKEN);
    await expect.poll(() => page.evaluate(() => (
      JSON.parse(localStorage.getItem("medimate.auth"))?.isProfileCompleted
    ))).toBe(true);
  });

  test("queues concurrent 401 responses behind one refresh", async ({ page }) => {
    await preparePage(page);
    await storePatientAuth(page, VALID_ACCESS_TOKEN);

    let refreshCalls = 0;
    const requestAttempts = new Map();

    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const requestUrl = new URL(request.url());

      if (requestUrl.pathname.endsWith("/authentication/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 75));
        await route.fulfill(jsonResponse({
          success: true,
          data: {
            accessToken: REFRESHED_ACCESS_TOKEN,
          },
        }));
        return;
      }

      if (requestUrl.pathname.includes("/session-test/")) {
        const key = requestUrl.pathname;
        requestAttempts.set(key, (requestAttempts.get(key) ?? 0) + 1);
        const authorization = request.headers().authorization;

        if (authorization === `Bearer ${VALID_ACCESS_TOKEN}`) {
          await route.fulfill(jsonResponse({
            success: false,
            message: "Unauthorized",
          }, 401));
          return;
        }

        await route.fulfill(jsonResponse({ success: true, data: key }));
        return;
      }

      await route.continue();
    });

    await page.goto("/support", { waitUntil: "domcontentloaded" });
    const responses = await page.evaluate(async () => {
      const { apiRequest } = await import("/src/services/apiClient.js");

      return Promise.all([
        apiRequest("/api/session-test/one", { auth: true }),
        apiRequest("/api/session-test/two", { auth: true }),
      ]);
    });

    expect(responses).toHaveLength(2);
    expect(refreshCalls).toBe(1);
    expect(requestAttempts.get("/api/session-test/one")).toBe(2);
    expect(requestAttempts.get("/api/session-test/two")).toBe(2);
  });

  test("logs out only after restoring an expired session fails", async ({ page }) => {
    await preparePage(page);
    await storePatientAuth(page, EXPIRED_ACCESS_TOKEN);

    await page.route("**/api/authentication/refresh", (route) => route.fulfill(
      jsonResponse({
        success: false,
        message: "Refresh token missing, invalid, or expired",
      }, 401),
    ));

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/login\?returnTo=%2Fdashboard$/);
    await expect.poll(() => page.evaluate(() => (
      localStorage.getItem("medimate.auth")
    ))).toBeNull();
  });
});
