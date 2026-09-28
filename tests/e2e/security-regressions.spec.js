import { expect, test } from "@playwright/test";
import { preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50In0",
  "",
].join(".");

test("stored authentication excludes sensitive profile fields", async ({ page }) => {
  await preparePage(page);
  await page.goto("/support", { waitUntil: "domcontentloaded" });

  const storedAuth = await page.evaluate(async (accessToken) => {
    const { setStoredAuth } = await import("/src/services/apiClient.js");
    setStoredAuth({
      accessToken,
      userId: "55555555-5555-4555-8555-555555555555",
      roles: ["Patient"],
      address: "123 Sensitive Street",
      gender: "male",
      dateOfBirth: "1990-01-01",
      phoneNumber: "+84901234567",
    });
    return JSON.parse(localStorage.getItem("medimate.auth"));
  }, ACCESS_TOKEN);

  expect(storedAuth.accessToken).toBe(ACCESS_TOKEN);
  expect(storedAuth.userId).toBe("55555555-5555-4555-8555-555555555555");
  expect(storedAuth).not.toHaveProperty("address");
  expect(storedAuth).not.toHaveProperty("gender");
  expect(storedAuth).not.toHaveProperty("dateOfBirth");
  expect(storedAuth).not.toHaveProperty("phoneNumber");
});

test("image uploads reject active SVG content", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const validationMessage = await page.evaluate(async () => {
    const { validateCloudinaryImage } = await import("/src/services/cloudinaryUploadService.js");
    const svg = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
      "unsafe.svg",
      { type: "image/svg+xml" },
    );

    try {
      validateCloudinaryImage(svg);
      return "";
    } catch (error) {
      return error.message;
    }
  });

  expect(validationMessage).toBe("Ảnh phải là file JPG, PNG hoặc WEBP.");
});
