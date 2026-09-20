export const saleCampaignFixtures = [
  { id: "older", name: "Sale tháng trước", startAt: "2026-08-01T12:00:00Z", endAt: "2026-08-02T12:00:00Z", isActive: false, displayStatus: "Disabled" },
  { id: "latest", name: "September Sale", startAt: "2026-09-20T12:00:00Z", endAt: "2026-09-22T12:00:00Z", isActive: true },
];

export function saleImpactFixture(overrides = {}) {
  return {
    campaignId: "latest", campaignName: "September Sale", badgeText: "HOT SALE", campaignStatus: "Ended",
    startAt: "2026-09-20T12:00:00Z", endAt: "2026-09-22T12:00:00Z",
    windows: {
      beforeStart: "2026-09-18T12:00:00Z", beforeEnd: "2026-09-20T12:00:00Z",
      duringStart: "2026-09-20T12:00:00Z", duringEnd: "2026-09-22T12:00:00Z",
      afterStart: "2026-09-22T12:00:00Z", afterEnd: "2026-09-23T12:00:00Z",
      isAfterPeriodPartial: true, isCampaignEnded: true, isCampaignActive: false, isCampaignNotStarted: false,
    },
    metrics: {
      revenueBefore: 1200000, revenueDuring: 1800000, revenueAfter: 1350000,
      paidOrdersBefore: 24, paidOrdersDuring: 38, paidOrdersAfter: 27,
      revenueChangeAmount: 600000, revenueChangePercent: 50,
      campaignRevenue: 1450000, campaignPaidOrders: 31, averageCampaignOrderValue: 46774.19,
      campaignDiscountAmount: 410000, campaignBonusCreditGranted: 96,
    },
    series: [
      { date: "2026-09-20", period: "Before", totalRevenue: 100000, campaignRevenue: 0, paidOrders: 1, campaignOrders: 0 },
      { date: "2026-09-20", period: "During", totalRevenue: 200000, campaignRevenue: 150000, paidOrders: 2, campaignOrders: 1 },
      { date: "2026-09-21", period: "During", totalRevenue: 600000, campaignRevenue: 450000, paidOrders: 6, campaignOrders: 4 },
      { date: "2026-09-22", period: "During", totalRevenue: 400000, campaignRevenue: 350000, paidOrders: 4, campaignOrders: 3 },
      { date: "2026-09-22", period: "After", totalRevenue: 200000, campaignRevenue: 180000, paidOrders: 2, campaignOrders: 1 },
    ],
    ...overrides,
  };
}
