export const ASYNC_SESSION_STATUS = Object.freeze({
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
});

const STATUS_ALIASES = new Map([
  ["0", ASYNC_SESSION_STATUS.PROCESSING],
  ["processing", ASYNC_SESSION_STATUS.PROCESSING],
  ["pending", ASYNC_SESSION_STATUS.PROCESSING],
  ["queued", ASYNC_SESSION_STATUS.PROCESSING],
  ["1", ASYNC_SESSION_STATUS.COMPLETED],
  ["complete", ASYNC_SESSION_STATUS.COMPLETED],
  ["completed", ASYNC_SESSION_STATUS.COMPLETED],
  ["ready", ASYNC_SESSION_STATUS.COMPLETED],
  ["2", ASYNC_SESSION_STATUS.FAILED],
  ["failed", ASYNC_SESSION_STATUS.FAILED],
  ["failure", ASYNC_SESSION_STATUS.FAILED],
  ["error", ASYNC_SESSION_STATUS.FAILED],
  ["cancelled", ASYNC_SESSION_STATUS.FAILED],
  ["canceled", ASYNC_SESSION_STATUS.FAILED],
]);

export function normalizeAsyncSessionStatus(value, fallback = ASYNC_SESSION_STATUS.PROCESSING) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  return STATUS_ALIASES.get(normalized) ?? fallback;
}

export function isAsyncSessionTerminal(value) {
  const status = normalizeAsyncSessionStatus(value);
  return status === ASYNC_SESSION_STATUS.COMPLETED || status === ASYNC_SESSION_STATUS.FAILED;
}
