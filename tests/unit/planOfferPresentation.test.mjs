import assert from "node:assert/strict";
import test from "node:test";
import { getOfferBenefits } from "../../src/utils/planOfferPresentation.js";

test("benefits include promotional credits, not just the base quota", () => {
  for (const bonusCredit of [2, 3]) {
    const total = 2 + bonusCredit;
    const offer = { baseCredit: 2, bonusCredit, grantedCredit: total,
      plan: { quotas: [{ quotaCode: "SERVICE_CREDIT", limitValue: 2 }] } };
    assert.equal(getOfferBenefits(offer)[0], `${total} lượt dùng chung cho kế hoạch phục hồi, tư vấn trước khám và phân tích xét nghiệm`);
  }
});

test("normal offers and numeric strings display the API total", () => {
  assert.match(getOfferBenefits({ grantedCredit: "2", offer: null })[0], /^2 lượt/);
  // Do not recompute totals from base and bonus when the API has a total.
  assert.match(getOfferBenefits({ baseCredit: 2, bonusCredit: 3, grantedCredit: 4 })[0], /^4 lượt/);
});

test("missing or invalid totals do not fall back to misleading base credits", () => {
  for (const grantedCredit of [undefined, null, "", " ", -1, 1.5, Infinity, "invalid"]) {
    assert.deepEqual(getOfferBenefits({ grantedCredit, baseCredit: 2 }), []);
  }
  assert.deepEqual(getOfferBenefits(null), []);
  assert.match(getOfferBenefits({ grantedCredit: 0 })[0], /^0 lượt/);
});
