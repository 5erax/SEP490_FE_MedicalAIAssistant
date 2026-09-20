import assert from "node:assert/strict";
import test from "node:test";
import { buildRevenueGrowth } from "../../src/components/adminOverview/overviewChartUtils.js";
import { formatRevenueChange, getSaleWindowPresentation, loadAllSaleCampaigns, normalizeSaleRevenueSeries } from "../../src/components/adminOverview/saleRevenueImpactUtils.js";
import { ENDPOINTS } from "../../src/services/endpoints.js";

test("monthly revenue uses paidAt, excludes missing/invalid dates and non-paid payments", () => {
  const result = buildRevenueGrowth([
    { status: "Paid", amount: 100, createdAt: "2026-08-15T12:00:00Z", paidAt: "2026-09-15T12:00:00Z" },
    ...[null, undefined, "", "invalid"].map((paidAt) => ({ status: "paid", amount: 999, createdAt: "2027-01-01T12:00:00Z", paidAt })),
    { status: "pending", amount: 999, paidAt: "2027-01-01T12:00:00Z" },
    { status: "refunded", amount: 999, paidAt: "2026-09-15T12:00:00Z" },
    { status: "paid", amount: 200, paidAt: "2025-09-15T12:00:00Z" },
  ]);
  assert.equal(result.year, 2026);
  assert.equal(result.total, 100);
  assert.equal(result.series.length, 12);
  assert.equal(result.series[7].value, 0);
  assert.equal(result.series[8].value, 100);
  assert.equal(result.series.reduce((sum, point) => sum + point.value, 0), result.total);
});

test("no valid paidAt never falls back to checkout creation dates or epoch", () => {
  const result = buildRevenueGrowth([{ status: "paid", amount: 50, paidAt: null, createdAt: "2040-08-01" }]);
  assert.equal(result.year, new Date().getFullYear());
  assert.equal(result.total, 0);
  assert.ok(result.series.every((point) => point.value === 0));
});

test("daily rows retain response order, amounts and distinct keys for same-day periods", () => {
  const input = ["Before", "During", "After"].map((period, i) => ({ date: "2026-09-20", period, totalRevenue: i * 100, campaignRevenue: i * 75 }));
  const result = normalizeSaleRevenueSeries(input);
  assert.deepEqual(result.map(({ period }) => period), ["Before", "During", "After"]);
  assert.equal(new Set(result.map(({ id }) => id)).size, 3);
  assert.deepEqual(result.map(({ totalRevenue }) => totalRevenue), [0, 100, 200]);
  assert.deepEqual(result.map(({ dateLabel }) => dateLabel), ["20/09", "20/09", "20/09"]);
  assert.equal(input[0].id, undefined);
});

test("date-only labels stay unchanged in a negative UTC offset", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.equal(normalizeSaleRevenueSeries([{ date: "2026-09-20", period: "Before" }])[0].dateLabel, "20/09");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("change percentage distinguishes null from zero and signed changes", () => {
  assert.equal(formatRevenueChange(null), "N/A - kỳ trước chưa có doanh thu");
  assert.equal(formatRevenueChange(0), "0%");
  assert.equal(formatRevenueChange(50), "+50%");
  assert.equal(formatRevenueChange(-12.5), "-12,5%");
  assert.match(formatRevenueChange(Infinity), /^N\/A/);
});

test("After is only shown for ended campaigns with an actual After window, including zero revenue", () => {
  const impact = { campaignStatus: "Ended", windows: { afterStart: "2026-09-22", afterEnd: "2026-09-23", isAfterPeriodPartial: true }, series: [{ date: "2026-09-22", period: "After", totalRevenue: 0 }] };
  assert.equal(getSaleWindowPresentation(impact).showAfter, true);
  assert.equal(getSaleWindowPresentation(impact).partialAfter, true);
  assert.equal(getSaleWindowPresentation({ ...impact, campaignStatus: "Active" }).showAfter, false);
  assert.equal(getSaleWindowPresentation({ ...impact, series: [] }).showAfter, false);
  assert.equal(getSaleWindowPresentation({ ...impact, campaignStatus: "NotStarted" }).notStarted, true);
  assert.equal(getSaleWindowPresentation({ ...impact, campaignStatus: "NotStarted" }).showAfter, false);
});

test("selector loads every page and includes disabled/ended campaigns sorted newest first", async () => {
  const calls = [];
  const items = await loadAllSaleCampaigns({ list: async (page, size) => {
    calls.push([page, size]);
    return { data: { totalPages: 2, items: page === 1
      ? [{ id: "old", startAt: "2025-01-01", isActive: false }]
      : [{ id: "new", startAt: "2026-09-20", displayStatus: "Ended" }] } };
  } });
  assert.deepEqual(calls, [[1, 100], [2, 100]]);
  assert.deepEqual(items.map(({ id }) => id), ["new", "old"]);
});

test("revenue impact endpoint encodes campaign IDs", () => {
  assert.equal(ENDPOINTS.ADMIN_SALE_CAMPAIGNS.REVENUE_IMPACT("id/with space"), "/api/admin/sale-campaigns/id%2Fwith%20space/revenue-impact");
});
