function normalizeErrorCode(value) {
  const code = String(value ?? "").trim();
  return /^[A-Z][A-Z0-9_]+$/.test(code) ? code : "";
}

export function getApiErrorCode(error) {
  const payload = error?.payload ?? {};
  const candidates = [
    payload.code,
    payload.errorCode,
    payload.data?.code,
    payload.data?.errorCode,
    ...(Array.isArray(payload.errors) ? payload.errors : []),
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const nested = normalizeErrorCode(candidate.code ?? candidate.errorCode);
      if (nested) return nested;
      continue;
    }

    const normalized = normalizeErrorCode(candidate);
    if (normalized) return normalized;
  }

  return "";
}
