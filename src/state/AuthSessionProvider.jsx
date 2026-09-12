import { useEffect, useState } from "react";
import { Alert, AppLoading, Button, ErrorState } from "../components/ui";
import {
  AUTH_REFRESH_LEAD_MS, getAuthExpiresAt, getStoredSessionAuth,
  isAuthExpired, isAuthRefreshDue, refreshAuthSession,
} from "../services/apiClient";
import { useAuthSession } from "./useAuthSession";

const MAX_TIMEOUT_MS = 2_147_483_647;

export function AuthSessionProvider({ children }) {
  const { storedAuth } = useAuthSession();
  const [failedToken, setFailedToken] = useState(null);
  const refreshFailed = Boolean(storedAuth && failedToken === storedAuth.accessToken);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!storedAuth) return undefined;
    let disposed = false;
    let refreshTimer;
    let renewing = false;
    let failures = 0;
    let retryAt = 0;

    async function renewSession() {
      if (disposed || renewing) return;
      renewing = true;
      window.clearTimeout(refreshTimer);
      try {
        await refreshAuthSession();
        if (!disposed) {
          failures = 0;
          retryAt = 0;
          setFailedToken(null);
        }
      } catch {
        if (!disposed && getStoredSessionAuth()) {
          setFailedToken(storedAuth.accessToken);
          // Back off instead of logging out or hammering an unavailable service.
          retryAt = Date.now() + Math.min(5_000 * 2 ** Math.min(failures++, 3), 30_000);
        }
      } finally {
        renewing = false;
        if (!disposed && getStoredSessionAuth()) scheduleRefresh();
      }
    }

    function scheduleRefresh() {
      window.clearTimeout(refreshTimer);
      const expiresAt = getAuthExpiresAt(getStoredSessionAuth());
      if (expiresAt === null) return;
      const delay = Math.max(expiresAt - Date.now() - AUTH_REFRESH_LEAD_MS, retryAt - Date.now());
      if (delay <= 0) void renewSession();
      else refreshTimer = window.setTimeout(scheduleRefresh, Math.min(delay, MAX_TIMEOUT_MS));
    }

    const handleAppWake = () => {
      if (document.visibilityState === "hidden" || Date.now() < retryAt) return;
      const currentAuth = getStoredSessionAuth();
      if (currentAuth && isAuthRefreshDue(currentAuth)) void renewSession();
    };

    scheduleRefresh();
    window.addEventListener("focus", handleAppWake);
    window.addEventListener("online", handleAppWake);
    document.addEventListener("visibilitychange", handleAppWake);
    return () => {
      disposed = true;
      window.clearTimeout(refreshTimer);
      window.removeEventListener("focus", handleAppWake);
      window.removeEventListener("online", handleAppWake);
      document.removeEventListener("visibilitychange", handleAppWake);
    };
  }, [storedAuth, retryVersion]);

  // Expiry alone is not logout: hold route guards until recovery or revocation.
  if (storedAuth && isAuthExpired(storedAuth)) {
    return refreshFailed ? <main className="workspace-root" aria-label="Khôi phục phiên đăng nhập">
      <section className="app-page container">
        <ErrorState title="Chưa thể kết nối để khôi phục phiên đăng nhập"
          description="Bạn chưa bị đăng xuất. Hãy kiểm tra kết nối mạng; hệ thống sẽ tự thử lại."
          action={<Button onClick={() => { setFailedToken(null); setRetryVersion((value) => value + 1); }}>Thử lại ngay</Button>} />
      </section>
    </main> : <AppLoading label="Đang khôi phục phiên đăng nhập..." />;
  }

  return <>
    {storedAuth && refreshFailed && <Alert live tone="warning" title="Kết nối đang gián đoạn">
      Bạn vẫn đang đăng nhập; hệ thống sẽ tự thử gia hạn phiên lại.
    </Alert>}
    {children}
  </>;
}
