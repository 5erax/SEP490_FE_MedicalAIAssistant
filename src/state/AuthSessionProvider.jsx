import {
  useEffect,
  useRef,
  useState,
} from "react";
import { AppLoading } from "../components/ui";
import {
  AUTH_REFRESH_LEAD_MS,
  getAuthExpiresAt,
  getStoredSessionAuth,
  isAuthExpired,
  isAuthRefreshDue,
  refreshAuthSession,
} from "../services/apiClient";
import { useAuthSession } from "./useAuthSession";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function AuthSessionProvider({ children }) {
  const { auth, storedAuth } = useAuthSession();
  const mountedRef = useRef(true);
  const [isCheckingSession, setIsCheckingSession] =
    useState(() => {
      const initialAuth = getStoredSessionAuth();
      return Boolean(
        initialAuth && isAuthExpired(initialAuth),
      );
    });

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!storedAuth) {
      return undefined;
    }

    let refreshTimer;

    const renewSession = async (blocking = false) => {
      if (blocking) {
        setIsCheckingSession(true);
      }

      try {
        await refreshAuthSession();
      } catch {
        // apiClient đã xóa session; route guard sẽ chuyển về đăng nhập.
      } finally {
        if (mountedRef.current) {
          setIsCheckingSession(false);
        }
      }
    };

    const scheduleRefresh = () => {
      const currentAuth = getStoredSessionAuth();
      const expiresAt = getAuthExpiresAt(currentAuth);

      if (expiresAt === null) {
        return;
      }

      const delay =
        expiresAt -
        Date.now() -
        AUTH_REFRESH_LEAD_MS;

      if (delay <= 0) {
        void renewSession(isAuthExpired(currentAuth));
        return;
      }

      refreshTimer = window.setTimeout(
        scheduleRefresh,
        Math.min(delay, MAX_TIMEOUT_MS),
      );
    };

    scheduleRefresh();

    const handleAppWake = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      const currentAuth = getStoredSessionAuth();

      if (
        currentAuth &&
        isAuthRefreshDue(currentAuth)
      ) {
        void renewSession(isAuthExpired(currentAuth));
      }
    };

    window.addEventListener("focus", handleAppWake);
    document.addEventListener(
      "visibilitychange",
      handleAppWake,
    );

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener(
        "focus",
        handleAppWake,
      );
      document.removeEventListener(
        "visibilitychange",
        handleAppWake,
      );
    };
  }, [storedAuth]);

  if (isCheckingSession && !auth) {
    return (
      <AppLoading label="Đang khôi phục phiên đăng nhập..." />
    );
  }

  return children;
}
