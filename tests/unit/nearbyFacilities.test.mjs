import assert from "node:assert/strict";
import test from "node:test";
import { buildNearbyQuery, findNearbySpecialtyFacilities, getNearbyMapFocusPoints, getNextNearbyRadius, rankNearestFacilities } from "../../src/utils/nearbyFacilities.js";

const specialtyFilters = { latitude: 10.8, longitude: 106.65, departmentId: "D1" };
const nearbyItem = { id: "A", latitude: 10.803, longitude: 106.65, distanceKm: 0.35, departments: [{ departmentId: "D1" }] };

test("specialty search expands only empty radii and preserves the specialty", async () => {
  const calls = [];
  const result = await findNearbySpecialtyFacilities(async (filters) => {
    calls.push(filters);
    return { success: true, data: filters.radiusKm === 1 ? [] : [{ ...nearbyItem, distanceKm: 2.4 }] };
  }, specialtyFilters);
  assert.deepEqual(calls.map((call) => call.radiusKm), [1, 3]);
  assert.ok(calls.every((call) => call.departmentId === "D1" && call.limit === 20));
  assert.equal(result.radiusKm, 3);
  assert.equal(result.items.length, 1);
});

test("one matching facility stops the search immediately", async () => {
  let calls = 0;
  const result = await findNearbySpecialtyFacilities(async () => { calls++; return { data: [nearbyItem] }; }, specialtyFilters);
  assert.equal(calls, 1);
  assert.equal(result.radiusKm, 1);
});

test("empty automatic search stops at the 50 km safety limit", async () => {
  const calls = [];
  const result = await findNearbySpecialtyFacilities(async ({ radiusKm }) => { calls.push(radiusKm); return { data: [] }; }, specialtyFilters);
  assert.deepEqual(calls, [1, 3, 5, 7, 10, 15, 20, 30, 50]);
  assert.deepEqual(result, { items: [], radiusKm: 50 });
});

test("automatic search reaches the first populated radius without requiring user clicks", async () => {
  const calls = [];
  const result = await findNearbySpecialtyFacilities(async ({ radiusKm }) => {
    calls.push(radiusKm);
    return { data: radiusKm === 20 ? Array.from({ length: 4 }, (_, index) => ({ ...nearbyItem, id: `F${index}`, distanceKm: 16 + index })) : [] };
  }, specialtyFilters);
  assert.deepEqual(calls, [1, 3, 5, 7, 10, 15, 20]);
  assert.equal(result.radiusKm, 20);
  assert.equal(result.items.length, 4);
});

test("API and malformed data errors never trigger radius expansion", async () => {
  for (const payload of [{ success: false, data: [] }, { data: null }, { data: [{ ...nearbyItem, distanceKm: 35 }] }, { data: [{ ...nearbyItem, departments: [{ departmentId: "D2" }] }] }]) {
    let calls = 0;
    await assert.rejects(findNearbySpecialtyFacilities(async () => { calls++; return payload; }, specialtyFilters));
    assert.equal(calls, 1);
  }
});

test("aborted specialty searches cannot expand after a late response", async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(findNearbySpecialtyFacilities(async () => {
    calls++;
    controller.abort();
    return { data: [] };
  }, specialtyFilters, controller.signal), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("bad nearby records are not treated as an empty successful radius", async () => {
  for (const item of [null, { ...nearbyItem, id: null }, { ...nearbyItem, latitude: " " }, { ...nearbyItem, departments: {} }]) {
    let calls = 0;
    await assert.rejects(findNearbySpecialtyFacilities(async () => { calls++; return { data: [item] }; }, specialtyFilters));
    assert.equal(calls, 1);
  }
});

test("nearest ranks the full catalog including facilities beyond 7 and 50 km", () => {
  const items = [{ id: "far", latitude: 1, longitude: 0 }, { id: "near", latitude: 0.1, longitude: 0 }];
  const result = rankNearestFacilities(items, 0, 0);
  assert.deepEqual(result.map((item) => item.id), ["near", "far"]);
  assert.ok(result[0].distanceKm > 7);
  assert.ok(result[1].distanceKm > 50);
  assert.equal(items[0].distanceKm, undefined);
});
test("nearest excludes missing or invalid coordinates and inactive facilities", () => {
  const result = rankNearestFacilities([
    { latitude: null, longitude: 0 }, { latitude: "", longitude: 0 },
    { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 0, isActive: false },
    { latitude: "0", longitude: "0" },
  ], 0, 0);
  assert.equal(result.length, 1);
  assert.equal(result[0].distanceKm, 0);
  assert.throws(() => rankNearestFacilities([], null, 0));
});

test("expanding the search preserves specialty and stops at the largest radius", () => {
  assert.equal(getNextNearbyRadius(7), 10);
  assert.equal(getNextNearbyRadius(50), null);
  const query = new URLSearchParams(buildNearbyQuery({ latitude: 10, longitude: 106, radiusKm: getNextNearbyRadius(7), departmentId: "respiratory" }));
  assert.equal(query.get("radiusKm"), "10");
  assert.equal(query.get("departmentId"), "respiratory");
});

test("nearby search frames the user with five nearest facilities while show-all includes every result", () => {
  const facilities = Array.from({ length: 7 }, (_, index) => ({ longitude: 106 + index / 100, latitude: 10 + index / 100 }));
  const location = { lng: 106.7, lat: 10.7 };
  assert.deepEqual(getNearbyMapFocusPoints(facilities, location), [
    ...facilities.slice(0, 5).map((item) => [item.longitude, item.latitude]),
    [location.lng, location.lat],
  ]);
  assert.equal(getNearbyMapFocusPoints(facilities, location, true).length, 8);
  assert.equal(getNearbyMapFocusPoints(facilities, null).length, 7);
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
