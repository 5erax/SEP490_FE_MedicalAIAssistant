import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

const ACCESS_TOKEN = [
  "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0",
  "eyJleHAiOjQxNDIzNjgwMDAsInJvbGUiOiJQYXRpZW50IiwiZW1haWwiOiJwYXRpZW50QGV4YW1wbGUuY29tIn0",
  "",
].join(".");

test.describe("patient specialty intake", () => {
  test("supports reviewable prompts and an accessible submission handoff", async ({ page }) => {
    await preparePage(page);
    await page.addInitScript((accessToken) => {
      localStorage.setItem("medimate.auth", JSON.stringify({
        accessToken,
        roles: ["Patient"],
      }));
    }, ACCESS_TOKEN);
    await openRoute(page, "/dashboard");

    const symptoms = page.getByLabel("Triệu chứng bạn đang gặp");
    const submit = page.getByRole("button", { name: "Gợi ý chuyên khoa" });

    await expect(symptoms).toHaveAttribute(
      "aria-describedby",
      /specialty-symptoms-hint/,
    );
    await expect(submit).toBeDisabled();
    await expect(page.getByText("Khi nào cần cấp cứu?")).toBeVisible();

    await page.getByRole("button", { name: "Sốt nhẹ 2 ngày kèm đau họng" }).click();
    await expect(symptoms).toHaveValue("Sốt nhẹ 2 ngày kèm đau họng");
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(page).toHaveURL(/\/symptom$/);
    await expect(page.getByLabel("Triệu chứng của bạn")).toHaveValue("Sốt nhẹ 2 ngày kèm đau họng");

    const prefill = await page.evaluate(() => sessionStorage.getItem("medimate.symptom.prefill"));
    expect(prefill).toBeNull();
  });
});
