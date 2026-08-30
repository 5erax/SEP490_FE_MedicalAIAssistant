import assert from "node:assert/strict";
import test from "node:test";
import { buildCheckoutBody, getPricingSnapshot, isSamePricingSnapshot } from "../../src/services/pricingSnapshot.js";

const normal = { plan: { id: "plan-1" }, effectivePrice: 20000, grantedCredit: 2, offer: null };
const sale = { ...normal, effectivePrice: 15000, grantedCredit: 3, offer: { offerId: "offer-a" } };

test("No-Sale always sends explicit null offer id with price and credits", () => {
  assert.deepEqual(buildCheckoutBody("plan-1", false, normal), {
    planId: "plan-1", autoRenew: false, expectedOfferId: null,
    expectedEffectivePrice: 20000, expectedGrantedCredit: 2,
  });
});
test("Sale snapshot uses the wrapper values, not nested offer values", () => {
  assert.deepEqual(buildCheckoutBody("plan-1", false, { ...sale, offer: { offerId: "offer-a", effectivePrice: 1, grantedCredit: 99 } }), {
    planId: "plan-1", autoRenew: false, expectedOfferId: "offer-a", expectedEffectivePrice: 15000, expectedGrantedCredit: 3,
  });
});
test("legacy caller without a wrapper stays backward compatible", () => {
  assert.deepEqual(buildCheckoutBody("plan-1"), { planId: "plan-1", autoRenew: false });
});
test("same Sale and No-Sale snapshots match, including numeric strings", () => {
  assert.equal(isSamePricingSnapshot(normal, { ...normal, effectivePrice: "20000", grantedCredit: "2" }), true);
  assert.equal(isSamePricingSnapshot(sale, { ...sale, offer: { offerId: "offer-a", badgeText: "New label" } }), true);
});
test("new Sale, sold out and released slots all require re-confirmation", () => {
  assert.equal(isSamePricingSnapshot(normal, sale), false);
  assert.equal(isSamePricingSnapshot(sale, normal), false);
});
test("same-offer price/credit changes and new offer identity require re-confirmation", () => {
  for (const update of [{ effectivePrice: 18000 }, { grantedCredit: 4 }, { offer: { offerId: "offer-b" } }]) {
    assert.equal(isSamePricingSnapshot(sale, { ...sale, ...update }), false);
  }
  assert.equal(isSamePricingSnapshot(normal, { ...normal, effectivePrice: 18000 }), false);
  assert.equal(isSamePricingSnapshot(normal, { ...normal, grantedCredit: 4 }), false);
});
test("removed or invalid plans never match or serialize a malformed strict request", () => {
  assert.equal(isSamePricingSnapshot(normal, undefined), false);
  assert.equal(isSamePricingSnapshot(null, null), false);
  for (const update of [{ effectivePrice: null }, { effectivePrice: "" }, { effectivePrice: Infinity }, { grantedCredit: 1.5 }, { grantedCredit: -1 }]) {
    const invalid = { ...normal, ...update };
    assert.equal(getPricingSnapshot(invalid), null);
    assert.throws(() => buildCheckoutBody("plan-1", false, invalid));
  }
  assert.throws(() => buildCheckoutBody("other-plan", false, normal));
});
