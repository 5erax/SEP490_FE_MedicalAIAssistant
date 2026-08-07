const SUCCESS_STATUS = "paid";
const FAILURE_STATUSES = new Set(["failed", "cancelled", "canceled", "refunded"]);

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

function getYearKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return String(date.getFullYear());
}

// Growth is shown as a cumulative running total across years, the
// conventional shape for a "revenue growth" chart - each point is the sum
// of every successful payment up to and including that year.
export function buildRevenueGrowth(payments) {
  const paidPayments = payments.filter((payment) => String(payment?.status ?? "").toLowerCase() === SUCCESS_STATUS);
  const total = paidPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

  const byYear = new Map();
  paidPayments.forEach((payment) => {
    const key = getYearKey(payment.createdAt);
    if (!key) return;
    byYear.set(key, (byYear.get(key) ?? 0) + (Number(payment.amount) || 0));
  });

  let cumulative = 0;
  const series = Array.from(byYear.keys())
    .sort()
    .map((year) => {
      cumulative += byYear.get(year);
      return { label: year, value: cumulative };
    });

  return { series, total };
}

export function buildPaymentStatusCounts(payments) {
  return payments.reduce(
    (counts, payment) => {
      const status = String(payment?.status ?? "").toLowerCase();
      if (status === SUCCESS_STATUS) counts.success += 1;
      else if (FAILURE_STATUSES.has(status)) counts.failure += 1;
      return counts;
    },
    { success: 0, failure: 0 },
  );
}
