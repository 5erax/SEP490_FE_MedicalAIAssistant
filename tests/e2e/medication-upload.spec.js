import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { preparePage } from "./helpers";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50In0",
  "",
].join(".");

test("medication upload rejects unsupported files and previews decoded images", async ({ page }) => {
  await preparePage(page);
  await page.addInitScript((accessToken) => {
    localStorage.setItem("medimate.auth", JSON.stringify({
      accessToken,
      roles: ["Patient"],
      isPremium: true,
      firstLogin: false,
      isProfileCompleted: true,
    }));
  }, ACCESS_TOKEN);

  await page.goto("/medication", { waitUntil: "domcontentloaded" });
  const fileInput = page.locator('.upload-zone input[type="file"]');

  await fileInput.setInputFiles({
    name: "not-an-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("<script>alert('xss')</script>"),
  });
  await expect(page.getByRole("alert")).toHaveText("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
  await expect(page.getByRole("button", { name: "Nhận diện" })).toBeDisabled();

  await fileInput.setInputFiles({
    name: "medicine.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });

  await expect(page.getByRole("img", { name: "Ảnh thuốc đã chọn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nhận diện" })).toBeEnabled();
});
