import assert from "node:assert/strict";
import test from "node:test";
import { getCapacityErrors, loadSaleCampaignCapacity } from "../../src/components/adminSales/saleCampaignCapacity.js";

const capacity = { occupiedRedemptions: 2, maxOccupiedPerUser: 2 };
test("blocks reducing total and per-user capacity from two occupied slots to one", () => {
  const errors = getCapacityErrors({ maxRedemptions: 1, maxRedemptionsPerUser: 1 }, capacity);
  assert.match(errors.maxRedemptions, /2/);
  assert.match(errors.maxRedemptionsPerUser, /2/);
});
test("accepts exact occupied capacity, increases and unlimited values", () => {
  for (const value of [2, 3, "", null]) {
    assert.deepEqual(getCapacityErrors({ maxRedemptions: value, maxRedemptionsPerUser: value }, capacity), {});
  }
});
test("rejects invalid limits and per-user capacity above the total", () => {
  for (const value of [-1, 0, 1.5, "invalid"]) {
    assert.ok(getCapacityErrors({ maxRedemptions: value, maxRedemptionsPerUser: value }).maxRedemptions);
  }
  assert.ok(getCapacityErrors({ maxRedemptions: 2, maxRedemptionsPerUser: 3 }).maxRedemptionsPerUser);
});
test("aggregates all pages, counts completed and reserved but excludes released and duplicates", async () => {
  const calls = [];
  const api = {
    get: async () => ({ data: { id: "campaign", occupiedRedemptions: 3 } }),
    redemptions: async (id, pageNumber) => {
      calls.push(pageNumber);
      return { data: { totalPages: 2, items: pageNumber === 1
        ? [{ id: "a", userId: "u1", status: "completed" }, { id: "b", userId: "u1", status: "released" }]
        : [{ id: "a", userId: "u1", status: "completed" }, { id: "c", userId: "u1", status: "reserved" }, { id: "d", userId: "u2", status: "completed" }] } };
    },
  };
  const snapshot = await loadSaleCampaignCapacity(api, "campaign");
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(snapshot.capacity, { occupiedRedemptions: 3, maxOccupiedPerUser: 2 });
});
test("does not treat missing usage or a failed history request as zero usage", async () => {
  await assert.rejects(loadSaleCampaignCapacity({ get: async () => ({ data: {} }) }, "campaign"));
  await assert.rejects(loadSaleCampaignCapacity({
    get: async () => ({ data: { occupiedRedemptions: 2 } }),
    redemptions: async () => { throw new Error("Network error"); },
  }, "campaign"));
});
