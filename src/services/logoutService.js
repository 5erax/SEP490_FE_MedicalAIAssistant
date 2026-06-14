import { authApi, clearStoredAuth } from "./api";

function clearMedimateSessionCache() {
  if (typeof sessionStorage === "undefined") return;

  Object.keys(sessionStorage)
    .filter((key) => key.startsWith("medimate."))
    .forEach((key) => sessionStorage.removeItem(key));
}

export async function logoutUser({ redirectTo = "/", onClear, redirect } = {}) {
  let apiError = null;

  try {
    await authApi.logout();
  } catch (error) {
    apiError = error;
  } finally {
    clearStoredAuth();
    clearMedimateSessionCache();
    onClear?.();

    if (typeof redirect === "function") {
      redirect(redirectTo);
    } else if (typeof window !== "undefined") {
      window.location.href = redirectTo;
    }
  }

  return { ok: !apiError, error: apiError };
}
