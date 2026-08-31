import test from "node:test";
import assert from "node:assert/strict";
import { paginateFacilities, getFacilityPage } from "../../src/utils/facilityPagination.js";
import { getSpecialtyExplanation, readRankingScore } from "../../src/utils/clinicalExplanation.js";
import { getReviewImages, reviewImageMap, reviewImagePatch } from "../../src/utils/reviewImages.js";

test("23 facilities remain reachable exactly once across five pages", () => {
  const facilities = Array.from({ length: 23 }, (_, index) => ({ facilityId: String(index) }));
  const pages = [1, 2, 3, 4, 5].map((page) => paginateFacilities(facilities, page));
  assert.deepEqual(pages.map((page) => page.items.length), [5, 5, 5, 5, 3]);
  assert.deepEqual(pages.flatMap((page) => page.items), facilities);
  assert.equal(getFacilityPage(facilities, "22"), 5);
  assert.equal(getFacilityPage(facilities, "missing"), null);
  assert.equal(paginateFacilities(facilities.slice(0, 6), 5).page, 2);
  assert.deepEqual([paginateFacilities([], 99).start, paginateFacilities([], 99).end], [0, 0]);
});

test("ranking adapter accepts only explicit normalized numbers, never guesses percent units", () => {
  for (const value of [null, undefined, "0.35", "", NaN, Infinity, -1, 35, 120]) {
    assert.equal(readRankingScore({ confidenceScore: value }), null);
  }
  for (const value of [0, .35, 1]) {
    assert.equal(readRankingScore({ pAGivenB: value }), value);
    assert.equal(readRankingScore({ confidenceScore: value }), value);
  }
});

test("specialty reasoning follows the unique source rather than the first ranked disease", () => {
  const diagnoses = [{ id: "first", diseaseName: "Bệnh A", clinicalReasoning: "Lý do A" },
    { id: "source", diseaseName: "Cúm", clinicalReasoning: "Giải thích B" }];
  assert.equal(getSpecialtyExplanation({ reason: "cúm" }, diagnoses).reasoning, "Giải thích B");
  assert.equal(getSpecialtyExplanation({ sourceDiagnosisId: "source" }, diagnoses).reasoning, "Giải thích B");
  assert.equal(getSpecialtyExplanation({ sourceDiagnosisId: "unknown", reason: "cúm" }, diagnoses).reasoning, "");
  assert.equal(getSpecialtyExplanation({ reason: "cúm" }, [...diagnoses, diagnoses[1]]).reasoning, "");
  assert.equal(getSpecialtyExplanation({ reason: "khác" }, diagnoses).reasoning, "");
});

function applyServerPatch(existing, patch) {
  const result = { ...existing };
  for (const [key, url] of Object.entries(patch)) { if (url === null) delete result[key]; else result[key] = url; }
  return result;
}

test("image updates preserve arbitrary keys and explicitly delete removed and all photos", () => {
  const existing = { originalPhoto: "https://example.test/a.png", image2: "https://example.test/b.png", image3: "https://example.test/c.png" };
  const original = getReviewImages({ imageUrls: existing });
  const next = original.filter((image) => image.key !== "image2");
  assert.deepEqual(reviewImagePatch(original, next), { image2: null });
  assert.deepEqual(applyServerPatch(existing, reviewImagePatch(original, next)), reviewImageMap(next));
  assert.deepEqual(applyServerPatch(existing, reviewImagePatch(original, [])), {});
  assert.deepEqual(reviewImagePatch(original, original), {});
});

test("replacing one of five photos does not renumber retained images or exceed the server limit", () => {
  const existing = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [`old-${n}`, `https://example.test/${n}.png`]));
  const original = getReviewImages({ imageUrls: existing });
  const next = [...original.slice(1), { key: "new-photo", url: "https://example.test/new.png", status: "ready" }];
  assert.deepEqual(applyServerPatch(existing, reviewImagePatch(original, next)), reviewImageMap(next));
  assert.equal(Object.keys(applyServerPatch(existing, reviewImagePatch(original, next))).length, 5);
});
