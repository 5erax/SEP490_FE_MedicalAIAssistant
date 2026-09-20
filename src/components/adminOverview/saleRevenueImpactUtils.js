export const PERIOD_LABELS = {
  Before: "Trước Sale",
  During: "Trong Sale",
  After: "Sau Sale",
};

export const TIMELINE_STATUS_LABELS = {
  NotStarted: "Chưa bắt đầu",
  Active: "Đang trong timeline",
  Ended: "Đã kết thúc timeline",
};

const dateOnlyFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", timeZone: "UTC",
});

export function normalizeSaleRevenueSeries(series = []) {
  // Each response row is a separate timestamp window, even on the same date.
  return series.map((item, index) => {
    const date = new Date(`${item.date}T00:00:00Z`);
    return {
      ...item,
      id: `${item.date}-${item.period}-${index}`,
      dateLabel: Number.isNaN(date.getTime()) ? item.date : dateOnlyFormatter.formatToParts(date)
        .filter((part) => part.type === "day" || part.type === "month").map((part) => part.value).join("/"),
      periodLabel: PERIOD_LABELS[item.period] ?? item.period,
    };
  });
}

export function formatRevenueChange(percent) {
  if (percent == null || !Number.isFinite(Number(percent))) return "N/A - kỳ trước chưa có doanh thu";
  const value = Number(percent);
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)}%`;
}

export function getSaleWindowPresentation(impact) {
  const windows = impact.windows ?? {};
  const notStarted = windows.isCampaignNotStarted || impact.campaignStatus === "NotStarted";
  const ended = windows.isCampaignEnded || impact.campaignStatus === "Ended";
  const showAfter = !notStarted && ended && Boolean(windows.afterStart && windows.afterEnd)
    && (impact.series ?? []).some((point) => point.period === "After");
  return {
    notStarted,
    showAfter,
    partialAfter: showAfter && Boolean(windows.isAfterPeriodPartial),
    description: notStarted
      ? "Campaign chưa bắt đầu; chưa có dữ liệu Before/During/After để so sánh."
      : ended
        ? "So sánh Trước / Trong / Sau Sale theo các khoảng thời gian tương ứng."
        : "So sánh với khoảng thời gian liền trước có cùng độ dài với thời gian Sale đã chạy.",
  };
}

export async function loadAllSaleCampaigns(api) {
  const first = await api.list(1, 100);
  const data = first?.data ?? {};
  const items = [...(data.items ?? [])];
  for (let page = 2; page <= (data.totalPages ?? 1); page += 1) {
    const response = await api.list(page, 100);
    items.push(...(response?.data?.items ?? []));
  }
  return items.sort((a, b) => (Date.parse(b.startAt) || 0) - (Date.parse(a.startAt) || 0));
}
