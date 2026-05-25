import { useEffect } from "react";
import { authApi, clearStoredAuth, hasStoredAuthRecord } from "../services/api";

const AUTH_REFRESH_INTERVAL_MS = 7 * 60 * 1000;

export function useSessionRefresh() {
  useEffect(() => {
    let stopped = false;

    async function refreshSession() {
      if (stopped || !hasStoredAuthRecord()) return;

      try {
        await authApi.refresh();
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          clearStoredAuth();
        }
      }
    }

    const intervalId = window.setInterval(refreshSession, AUTH_REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
