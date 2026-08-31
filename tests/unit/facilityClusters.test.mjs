import test from "node:test";
import assert from "node:assert/strict";
import { clusterFacilities } from "../../src/utils/facilityClusters.js";
const points = [
  { facilityId: "a", latitude: 10.8, longitude: 106.64 },
  { facilityId: "b", latitude: 10.80001, longitude: 106.64001 },
  { facilityId: "c", latitude: 21, longitude: 105 },
];
test("nearby pins cluster at low zoom without losing facilities", () => {
  const groups = clusterFacilities(points, 10);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.flatMap((group) => group.members.map((item) => item.facilityId)).sort(), ["a", "b", "c"]);
});
test("selected pin remains individually accessible", () => {
  const selected = clusterFacilities(points, 10, "a").find((group) => group.members.some((item) => item.facilityId === "a"));
  assert.equal(selected.members.length, 1);
});
test("zooming in separates pins and empty results are safe", () => {
  assert.equal(clusterFacilities(points, 14).length, 3);
  assert.deepEqual(clusterFacilities([], 10), []);
});
