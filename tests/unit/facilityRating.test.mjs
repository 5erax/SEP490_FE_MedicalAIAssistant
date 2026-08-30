import test from "node:test";
import assert from "node:assert/strict";
import { getFacilityRating, formatFacilityRating } from "../../src/utils/facilityRating.js";

test("displays the server aggregate across all feedback reviews", () => {
  assert.equal(formatFacilityRating({ averageRating: 1.5, reviewCount: 4 }), "1.5/5 · 4 đánh giá");
  assert.deepEqual(getFacilityRating({ averageRating: "4.25", reviewCount: "120" }), { average: 4.25, count: 120 });
});
test("zero reviews and unknown aggregates are distinct", () => {
  assert.equal(formatFacilityRating({ averageRating: null, reviewCount: 0 }), "Chưa có đánh giá");
  assert.equal(formatFacilityRating(null), "Chưa có điểm đánh giá");
});
test("invalid averages do not become misleading ratings", () => {
  for (const averageRating of [null, undefined, "", -1, 6, Infinity]) {
    assert.equal(getFacilityRating({ averageRating, reviewCount: 4 }).average, null);
  }
  assert.equal(getFacilityRating({ averageRating: 5, reviewCount: -1 }).count, null);
});
