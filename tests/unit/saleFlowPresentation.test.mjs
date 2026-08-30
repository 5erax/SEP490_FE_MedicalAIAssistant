import assert from "node:assert/strict";
import test from "node:test";
import { getRedemptionDate, hasRedemptionPriceDiscount } from "../../src/utils/saleRedemptionPresentation.js";
import { getPaymentAmountLabel } from "../../src/services/paymentStatusLabels.js";

const dates = { reservedAt: "2026-08-30T08:00:00Z", completedAt: "2026-08-30T08:10:00Z", releasedAt: "2026-08-30T08:15:00Z" };

test("redemption date follows status rather than the first populated timestamp", () => {
  assert.equal(getRedemptionDate({ ...dates, status: "Reserved" }), dates.reservedAt);
  assert.equal(getRedemptionDate({ ...dates, status: "Completed" }), dates.completedAt);
  assert.equal(getRedemptionDate({ ...dates, status: "Released" }), dates.releasedAt);
  assert.equal(getRedemptionDate({ ...dates, status: "RELEASED", releasedAt: null }), dates.reservedAt);
  assert.equal(getRedemptionDate({ ...dates, status: "completed", completedAt: null }), dates.reservedAt);
  assert.equal(getRedemptionDate(null), undefined);
});

test("only Paid payments use the paid amount label", () => {
  for (const status of ["Paid", "paid", "PAID"]) assert.equal(getPaymentAmountLabel(status), "Đã thanh toán");
  for (const status of ["Pending", "Failed", "Cancelled", "Expired", "Refunded", null, ""])
    assert.equal(getPaymentAmountLabel(status), "Số tiền giao dịch");
});

test("bonus-only sales have no struck-through price; discounts still do", () => {
  assert.equal(hasRedemptionPriceDiscount({ originalPrice: 149000, finalPrice: 149000, bonusCredit: 2 }), false);
  assert.equal(hasRedemptionPriceDiscount({ originalPrice: 149000, finalPrice: 120000, bonusCredit: 0 }), true);
  assert.equal(hasRedemptionPriceDiscount({ originalPrice: "149000", finalPrice: "120000", bonusCredit: 2 }), true);
  assert.equal(hasRedemptionPriceDiscount({ originalPrice: 149000, finalPrice: 0 }), true);
  assert.equal(hasRedemptionPriceDiscount({ originalPrice: 149000, finalPrice: null }), false);
});
