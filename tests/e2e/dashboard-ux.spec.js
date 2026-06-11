import { expect, test } from "@playwright/test";
import { openRoute, preparePage } from "./helpers.js";

test.describe("patient specialty intake", () => {
  test("supports reviewable prompts and an accessible submission handoff", async ({ page }) => {
    await page.route("**/api/web-chatbot/message", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            answer: "Bạn nên cân nhắc khám Nội tổng quát.",
            intent: "specialty_recommendation",
            needsMoreInformation: false,
          },
        }),
      });
    });

    await preparePage(page);
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
    await expect(page).toHaveURL(/\/map$/);

    const context = await page.evaluate(() => JSON.parse(sessionStorage.getItem("medimate.map.chat")));
    expect(context).toMatchObject({
      symptom: "Sốt nhẹ 2 ngày kèm đau họng",
      intent: "specialty_recommendation",
    });
  });
});
