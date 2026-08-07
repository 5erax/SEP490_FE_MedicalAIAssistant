const SUCCESS_STATUS = "paid";
const FAILURE_STATUSES = new Set(["failed", "cancelled", "canceled", "refunded"]);

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

function getMonthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `T${Number(month)}/${year}`;
}

// Growth is shown as a cumulative running total across months, the
// conventional shape for a "revenue growth" chart - each point is the sum
// of every successful payment up to and including that month.
export function buildRevenueGrowth(payments) {
  const paidPayments = payments.filter((payment) => String(payment?.status ?? "").toLowerCase() === SUCCESS_STATUS);
  const total = paidPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

  const byMonth = new Map();
  paidPayments.forEach((payment) => {
    const key = getMonthKey(payment.createdAt);
    if (!key) return;
    byMonth.set(key, (byMonth.get(key) ?? 0) + (Number(payment.amount) || 0));
  });

  let cumulative = 0;
  const series = Array.from(byMonth.keys())
    .sort()
    .map((key) => {
      cumulative += byMonth.get(key);
      return { label: formatMonthLabel(key), value: cumulative };
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
