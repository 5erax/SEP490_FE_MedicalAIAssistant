import { expect, test } from "@playwright/test";

test("symptom quota preserves the complete backend contract", async ({ page }) => {
  await page.goto("/");

  const quota = await page.evaluate(async () => {
    const { readSymptomAnalysisQuota } = await import("/src/services/symptomAnalysisService.js");

    return readSymptomAnalysisQuota({
      data: {
        businessDate: "2026-09-28",
        limitPerDay: 5,
        usedToday: 0,
        reservedToday: 1,
        remainingToday: 4,
        isFreeTier: false,
        hasServiceCredit: true,
      },
    });
  });

  expect(quota).toEqual({
    businessDate: "2026-09-28",
    limitPerDay: 5,
    usedToday: 0,
    reservedToday: 1,
    remainingToday: 4,
    isFreeTier: false,
    hasServiceCredit: true,
  });
});

test("symptom quota accepts PascalCase and clamps invalid counters", async ({ page }) => {
  await page.goto("/");

  const quota = await page.evaluate(async () => {
    const { readSymptomAnalysisQuota } = await import("/src/services/symptomAnalysisService.js");

    return readSymptomAnalysisQuota({
      data: {
        BusinessDate: "2026-09-28",
        LimitPerDay: "5",
        UsedToday: -1,
        ReservedToday: "2",
        RemainingToday: "3",
        IsFreeTier: true,
        HasServiceCredit: false,
      },
    });
  });

  expect(quota).toEqual({
    businessDate: "2026-09-28",
    limitPerDay: 5,
    usedToday: 0,
    reservedToday: 2,
    remainingToday: 3,
    isFreeTier: true,
    hasServiceCredit: false,
  });
});
