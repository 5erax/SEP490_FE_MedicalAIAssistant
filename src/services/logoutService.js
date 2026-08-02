import { authApi, clearStoredAuth, symptomAnalysisApi } from "./api";
import { stopRecoveryPlanConnection } from "./recoveryPlanRealtime";

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
    await stopRecoveryPlanConnection();
    symptomAnalysisApi.clearCachedClinicalAnalysis();
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
