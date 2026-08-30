import assert from "node:assert/strict";
import test from "node:test";
import { buildNearbyQuery, getNextNearbyRadius } from "../../src/utils/nearbyFacilities.js";

test("expanding the search preserves specialty and stops at the largest radius", () => {
  assert.equal(getNextNearbyRadius(7), 10);
  assert.equal(getNextNearbyRadius(50), null);
  const query = new URLSearchParams(buildNearbyQuery({ latitude: 10, longitude: 106, radiusKm: getNextNearbyRadius(7), departmentId: "respiratory" }));
  assert.equal(query.get("radiusKm"), "10");
  assert.equal(query.get("departmentId"), "respiratory");
});

test("nearby uses provided geolocation and defaults to 7 km / 20 results", () => {
  const query = new URLSearchParams(buildNearbyQuery({ latitude: 10.8028, longitude: 106.6433 }));
  assert.equal(query.get("latitude"), "10.8028");
  assert.equal(query.get("longitude"), "106.6433");
  assert.equal(query.get("radiusKm"), "7");
  assert.equal(query.get("limit"), "20");
  assert.equal(query.has("departmentId"), false);
});
test("radius and optional specialty are sent without an all sentinel", () => {
  const query = new URLSearchParams(buildNearbyQuery({ latitude: 0, longitude: 0, radiusKm: 15, departmentId: "department-id" }));
  assert.equal(query.get("radiusKm"), "15");
  assert.equal(query.get("departmentId"), "department-id");
  assert.equal(new URLSearchParams(buildNearbyQuery({ latitude: 0, longitude: 0, departmentId: "all" })).has("departmentId"), false);
});
test("invalid or missing coordinates never become a request", () => {
  for (const update of [{ latitude: null }, { latitude: undefined }, { latitude: 91 }, { longitude: 181 }, { radiusKm: 0 }, { radiusKm: NaN }]) {
    assert.throws(() => buildNearbyQuery({ latitude: 10, longitude: 106, ...update }));
  }
});
