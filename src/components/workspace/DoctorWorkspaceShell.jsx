import {
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi, getStoredAuth, doctorRecoveryPlanRequestsApi } from "../../services/api";
import { logoutUser } from "../../services/logoutService";
import { navigate } from "../../router/navigation";
import {
  ensureRecoveryPlanConnection,
  refreshDoctorMembership,
  subscribeToRecoveryPlanEvents,
} from "../../services/recoveryPlanRealtime";
import "../../styles/doctor-workspace-shell.css";

const NAV_ITEMS = [
  { key: "overview", path: "/app/staff", label: "Tổng quan", icon: LayoutDashboard },
  { key: "queue", path: "/app/staff/recovery-plans/queue", label: "Hàng đợi", icon: ClipboardList, countKey: "open" },
  { key: "mine", path: "/app/staff/recovery-plans/mine", label: "Yêu cầu của tôi", icon: ListChecks, countKey: "mine" },
];

function getInitials(name) {
  return String(name ?? "").split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "BS";
}

export default function DoctorWorkspaceShell({ activeKey, children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [openCount, setOpenCount] = useState(null);
  const [mineCount, setMineCount] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadOpenCount = useCallback(async () => {
    try {
      const response = await doctorRecoveryPlanRequestsApi.listOpen({ pageNumber: 1, pageSize: 1 });
      setOpenCount(Number(response?.data?.totalCount) || 0);
    } catch {
      setOpenCount(null);
    }
  }, []);

  const loadMineCount = useCallback(async () => {
    try {
      const response = await doctorRecoveryPlanRequestsApi.listMine({ pageNumber: 1, pageSize: 1 });
      setMineCount(Number(response?.data?.totalCount) || 0);
    } catch {
      setMineCount(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authApi.me()
      .then((response) => {
        if (active) setProfile(response.data ?? {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadOpenCount();
      void loadMineCount();
    });
  }, [loadOpenCount, loadMineCount]);

  useEffect(() => {
    const unsubscribe = subscribeToRecoveryPlanEvents((event) => {
      if (event.type === "connection" && event.status === "connected") {
        void refreshDoctorMembership();
      }
      if (event.type === "access") {
        void refreshDoctorMembership();
      }
      if (event.type === "queue" || event.type === "access" || event.refetch) {
        void loadOpenCount();
      }
      if (event.type === "request" || event.type === "access" || event.refetch) {
        void loadMineCount();
      }
    });

    ensureRecoveryPlanConnection().then((status) => {
      if (status === "connected") void refreshDoctorMembership();
    });

    return unsubscribe;
  }, [loadOpenCount, loadMineCount]);

  const displayName = profile?.displayName || profile?.fullName || profile?.name
    || auth?.displayName || auth?.fullName || auth?.name || "Bác sĩ";

  const counts = useMemo(() => ({ open: openCount, mine: mineCount }), [openCount, mineCount]);

  async function handleLogout() {
    await logoutUser({ onClear: () => setAuth(null), redirect: navigate });
  }

  if (!auth) return null;

  return (
    <div className="doctor-shell">
      <button
        type="button"
        className="doctor-shell-mobile-toggle"
        aria-expanded={mobileNavOpen}
        aria-controls="doctor-shell-sidebar"
        onClick={() => setMobileNavOpen((current) => !current)}
      >
        {mobileNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        Menu bác sĩ
      </button>

      <aside id="doctor-shell-sidebar" className={`doctor-shell-sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <a className="doctor-shell-brand" href="/">
          <span aria-hidden="true"><img src="/logo.svg" alt="" width="30" height="30" /></span>
          <span>MediMate AI</span>
        </a>

        <nav className="doctor-shell-nav" aria-label="Điều hướng không gian bác sĩ">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const count = item.countKey ? counts[item.countKey] : null;
            return (
              <a
                key={item.key}
                href={item.path}
                className={activeKey === item.key ? "is-active" : ""}
                aria-current={activeKey === item.key ? "page" : undefined}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
                {count !== null && count !== undefined && count > 0 && (
                  <span className="doctor-shell-badge">{count > 99 ? "99+" : count}</span>
                )}
              </a>
            );
          })}
        </nav>

        <div className="doctor-shell-account">
          <span className="doctor-shell-avatar" aria-hidden="true">{getInitials(displayName)}</span>
          <div>
            <strong>{displayName}</strong>
            <small>Bác sĩ</small>
          </div>
          <button type="button" aria-label="Đăng xuất" onClick={handleLogout}>
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main className="doctor-shell-content" id="main-content" tabIndex="-1">
        {children}
      </main>
    </div>
  );
}
