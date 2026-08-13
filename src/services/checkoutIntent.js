const CHECKOUT_INTENT_STORAGE_KEY = "medimate.checkout-intent.v1";
const CHECKOUT_INTENT_TTL_MS = 2 * 60 * 60 * 1000;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeIntent(value) {
  if (!value || typeof value !== "object") return null;

  const orderCode = normalizeText(value.orderCode);
  const subscriptionId = normalizeText(value.subscriptionId);
  const paymentId = normalizeText(value.paymentId);
  const transactionId = normalizeText(value.transactionId);
  const createdAt = Number(value.createdAt);

  if (!orderCode || !subscriptionId || !paymentId || !Number.isFinite(createdAt)) return null;
  if (createdAt + CHECKOUT_INTENT_TTL_MS <= Date.now()) return null;

  return {
    orderCode,
    subscriptionId,
    paymentId,
    transactionId,
    createdAt,
  };
}

export function saveCheckoutIntent(checkout) {
  if (!canUseStorage()) return null;

  const intent = normalizeIntent({
    orderCode: checkout?.orderCode,
    subscriptionId: checkout?.subscriptionId,
    paymentId: checkout?.paymentId,
    transactionId: checkout?.transactionId,
    createdAt: Date.now(),
  });

  if (!intent) return null;

  try {
    window.localStorage.setItem(CHECKOUT_INTENT_STORAGE_KEY, JSON.stringify(intent));
    return intent;
  } catch {
    return null;
  }
}

export function getCheckoutIntent() {
  if (!canUseStorage()) return null;

  try {
    const intent = normalizeIntent(JSON.parse(window.localStorage.getItem(CHECKOUT_INTENT_STORAGE_KEY) || "null"));
    if (!intent) window.localStorage.removeItem(CHECKOUT_INTENT_STORAGE_KEY);
    return intent;
  } catch {
    try {
      window.localStorage.removeItem(CHECKOUT_INTENT_STORAGE_KEY);
    } catch {
      // Storage may be unavailable in private or restricted browsing modes.
    }
    return null;
  }
}

export function clearCheckoutIntent(orderCode = "") {
  if (!canUseStorage()) return;

  try {
    const expectedOrderCode = normalizeText(orderCode);
    if (expectedOrderCode) {
      const current = getCheckoutIntent();
      if (current && current.orderCode !== expectedOrderCode) return;
    }
    window.localStorage.removeItem(CHECKOUT_INTENT_STORAGE_KEY);
  } catch {
    // Clearing a convenience snapshot must never block the payment result UI.
  }
}
