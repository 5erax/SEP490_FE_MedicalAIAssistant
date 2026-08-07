const SUCCESS_STATUS = "paid";
const FAILURE_STATUSES = new Set(["failed", "cancelled", "canceled", "refunded"]);

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

// Short form for labels squeezed above 12 monthly points on the chart
// (e.g. "1,7tr ₫") - the full formatCurrency() output is too wide to fit
// that many labels side by side without overlapping.
export function formatCompactCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return "0 ₫";
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const trim = (n) => n.toFixed(1).replace(/\.0$/, "").replace(".", ",");

  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)}tỷ ₫`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}tr ₫`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}k ₫`;
  return `${sign}${abs} ₫`;
}

function getYear(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

function getMonth(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getMonth();
}

// One point per calendar month (Jan-Dec) of the most recent year that has
// a successful payment, each showing that month's own revenue - not a
// running total - so the line can rise and fall month to month. Months
// with no revenue still get a point at 0 instead of being skipped.
export function buildRevenueGrowth(payments) {
  const paidPayments = payments.filter((payment) => String(payment?.status ?? "").toLowerCase() === SUCCESS_STATUS);
  const total = paidPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);

  const years = paidPayments.map((payment) => getYear(payment.createdAt)).filter((year) => year !== null);
  const targetYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();

  const byMonth = new Array(12).fill(0);
  paidPayments.forEach((payment) => {
    if (getYear(payment.createdAt) !== targetYear) return;
    const month = getMonth(payment.createdAt);
    if (month === null) return;
    byMonth[month] += Number(payment.amount) || 0;
  });

  const series = byMonth.map((value, month) => ({ label: `T${month + 1}`, value }));

  return { series, total, year: targetYear };
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
