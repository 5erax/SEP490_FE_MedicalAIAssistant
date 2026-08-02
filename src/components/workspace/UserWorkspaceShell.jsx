import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Crown,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Pill,
  Search,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navigate as goTo } from "../../router/navigation";
import { withReturnTo } from "../../router/returnIntent";
import { getNavigationModel } from "../../router/routes";
import { authApi, getStoredAuth, hasPremiumAccess, setStoredAuth } from "../../services/api";
import { logoutUser } from "../../services/logoutService";
import "../../styles/user-workspace.css";
import DisplayPreferences from "../preferences/DisplayPreferences";
import { Dialog, useOverlayFocus } from "../ui";
import PatientOnboardingAssistant from "./PatientOnboardingAssistant";
import PatientProfileSetupModal from "./PatientProfileSetupModal";
import { shouldSetupPatientProfile } from "../../utils/roles";

const PATIENT_ICONS = {
  dashboard: LayoutDashboard,
  symptom: Activity,
  chat: MessageSquare,
  map: MapPin,
  profile: UserRound,
  records: ClipboardList,
  recovery: CalendarDays,
  medication: Pill,
};

const NAV_ITEMS = getNavigationModel("patient")
  .filter((item) => item.id !== "patient.profile")
  .map((item) => ({
    ...item,
    icon: PATIENT_ICONS[item.icon],
  }));

const MOBILE_ITEMS = NAV_ITEMS.filter((item) => item.mobile);
const SECONDARY_ACTIVE_ITEMS = {
  "/chat": { label: "Trợ lý AI", icon: MessageSquare },
  "/profile": { label: "Hồ sơ", icon: UserRound },
  "/medication": { label: "Thuốc & lịch nhắc", icon: Pill },
  "/assessment/history": { label: "Lịch sử phân tích", icon: ClipboardList },
};
const EMPTY_ACCOUNT_CACHE = { accessToken: "", user: null };

let accountUserCache = EMPTY_ACCOUNT_CACHE;
let accountUserRequest = { accessToken: "", promise: null };

function getCurrentPath() {
  return window.location.pathname;
}

function isNavigationItemActive(item, path) {
  if (path === item.path) return true;
  return item.path === "/symptom" && path.startsWith("/assessment/");
}

function getInitials(nameOrEmail = "MediMate") {
  const name = String(nameOrEmail).split("@")[0];
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "MM";
}

function getAccountName(user, auth) {
  return user?.displayName
    || user?.fullName
    || user?.name
    || user?.email
    || auth?.displayName
    || auth?.fullName
    || auth?.name
    || auth?.email
    || auth?.username
    || "Người dùng";
}

function getAccountAvatar(user) {
  return user?.avatarUrl
    || user?.avatar
    || user?.picture
    || user?.photoUrl
    || user?.imageUrl
    || user?.profilePictureUrl
    || "";
}

function getCachedAccountUser(accessToken) {
  return accountUserCache.accessToken === accessToken ? accountUserCache.user : null;
}

function setCachedAccountUser(accessToken, user) {
  accountUserCache = { accessToken, user };
  return user;
}

function rememberAccountUser(accessToken, user) {
  if (!accessToken || !user) return user;

  const auth = getStoredAuth();
  if (auth?.accessToken === accessToken) {
    setStoredAuth({ ...auth, ...user });
  }

  return setCachedAccountUser(accessToken, user);
}

function loadAccountUser(accessToken) {
  if (accountUserRequest.accessToken === accessToken && accountUserRequest.promise) {
    return accountUserRequest.promise;
  }

  const promise = authApi.me()
    .then((response) => rememberAccountUser(accessToken, response.data ?? null))
    .finally(() => {
      if (accountUserRequest.accessToken === accessToken) {
        accountUserRequest = { accessToken: "", promise: null };
      }
    });

  accountUserRequest = { accessToken, promise };
  return promise;
}

export default function UserWorkspaceShell({ children }) {
  const [notice, setNotice] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountState, setAccountState] = useState(() => {
    const initialAuth = getStoredAuth();
    return {
      accessToken: initialAuth?.accessToken ?? "",
      user: initialAuth?.accessToken ? getCachedAccountUser(initialAuth.accessToken) : null,
    };
  });
  const [searchText, setSearchText] = useState("");
  const [setupCompletedAuth, setSetupCompletedAuth] = useState(null);
  const sidebarRef = useRef(null);
  const accountMenuRef = useRef(null);
  const accountButtonRef = useRef(null);
  const drawerCloseButtonRef = useRef(null);
  const mainRef = useRef(null);
  const mobileNavRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);
  const noticeDeferButtonRef = useRef(null);
  const noticeTriggerRef = useRef(null);
  const drawerInertRefs = useMemo(() => [mainRef, mobileNavRef], []);
  const auth = getStoredAuth();
  const accessToken = auth?.accessToken;
  const premiumAccess = hasPremiumAccess(auth);
  const path = getCurrentPath();
  const activeItem = NAV_ITEMS.find((item) => path === item.path)
    ?? SECONDARY_ACTIVE_ITEMS[path]
    ?? (path.startsWith("/assessment/")
      ? { label: "Phân tích lâm sàng", icon: Activity }
      : NAV_ITEMS[0]);
  const ActiveIcon = activeItem.icon;
  const accountUser = accountState.accessToken === accessToken ? accountState.user : null;
  const cachedAccountUser = accessToken ? getCachedAccountUser(accessToken) : null;
  const visibleAccountUser = accessToken ? (accountUser ?? cachedAccountUser ?? auth) : null;
  const displayName = getAccountName(visibleAccountUser, auth);
  const avatarUrl = getAccountAvatar(visibleAccountUser);
  const setupAuth = setupCompletedAuth?.accessToken === auth?.accessToken ? setupCompletedAuth : auth;
  const shouldShowPatientSetup = shouldSetupPatientProfile(setupAuth);

  async function logout() {
    setAccountMenuOpen(false);
    await logoutUser({ redirect: goTo });
  }

  function navigateFromAccount(pathToOpen) {
    setAccountMenuOpen(false);
    goTo(pathToOpen);
  }

  function isLocked(pathToOpen) {
    const item = NAV_ITEMS.find((entry) => entry.path === pathToOpen);
    return item?.access === "premium" && !premiumAccess;
  }

  function handleLockedNav(pathToOpen, trigger) {
    if (isLocked(pathToOpen)) {
      noticeTriggerRef.current = trigger ?? document.activeElement;
      setNotice({
        title: "Cần nâng cấp MediMate+",
        returnTo: pathToOpen,
        text: auth
          ? "Tính năng này nằm trong gói nâng cao. Bạn có thể xem bảng giá hoặc quay lại tư vấn chuyên khoa."
          : "Bạn vẫn có thể dùng tư vấn chuyên khoa và bản đồ. Những phần lưu hồ sơ, y bạ và chat nâng cao cần đăng ký rồi nâng cấp MediMate+.",
      });
      return;
    }

    goTo(pathToOpen);
  }

  function closeNotice() {
    setNotice(null);
  }

  function openPricingFromNotice() {
    const returnTo = notice?.returnTo;
    setNotice(null);
    goTo(withReturnTo("/pricing", returnTo));
  }

  function handleSearch(event) {
    event.preventDefault();
    const query = searchText.trim();
    goTo(query ? `/map?search=${encodeURIComponent(query)}` : "/map");
  }

  const handlePatientSetupComplete = useCallback((nextAuth) => {
    setSetupCompletedAuth(nextAuth);
    setAccountState({
      accessToken: nextAuth?.accessToken ?? "",
      user: nextAuth ?? null,
    });
  }, []);

  useOverlayFocus({
    active: mobileMenuOpen,
    containerRef: sidebarRef,
    initialFocusRef: drawerCloseButtonRef,
    restoreFocusRef: mobileMenuButtonRef,
    inertRefs: drawerInertRefs,
    onClose: () => setMobileMenuOpen(false),
  });

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let active = true;

    loadAccountUser(accessToken)
      .then((user) => {
        if (active) setAccountState({ accessToken, user });
      })
      .catch(() => {
        if (active && !getCachedAccountUser(accessToken)) {
          setAccountState({ accessToken, user: null });
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return undefined;

    const mobileViewport = window.matchMedia("(max-width: 860px)");
    let focusFrame = 0;

    function keepFocusedControlVisible(element) {
      if (
        !mobileViewport.matches
        || !(element instanceof HTMLElement)
        || !main.contains(element)
        || !element.matches("button, input, select, textarea, [tabindex]")
      ) {
        return;
      }

      window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(() => {
        const shell = main.closest(".user-shell");
        const topbar = main.querySelector(".user-shell-topbar");
        if (!shell || !topbar || !element.isConnected) return;

        const safeBottom = Number.parseFloat(
          window.getComputedStyle(shell).getPropertyValue("--patient-safe-bottom"),
        ) || 0;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const topBoundary = topbar.getBoundingClientRect().bottom + 8;
        const bottomBoundary = viewportHeight - safeBottom;
        const elementRect = element.getBoundingClientRect();

        if (elementRect.top < topBoundary || elementRect.bottom > bottomBoundary) {
          element.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
        }
      });
    }

    function handleFocusIn(event) {
      keepFocusedControlVisible(event.target);
    }

    function handleViewportResize() {
      keepFocusedControlVisible(document.activeElement);
    }

    main.addEventListener("focusin", handleFocusIn);
    window.visualViewport?.addEventListener("resize", handleViewportResize);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      main.removeEventListener("focusin", handleFocusIn);
      window.visualViewport?.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  return (
    <div className="user-shell">
      {mobileMenuOpen && (
        <button
          className="user-shell-drawer-backdrop"
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`user-shell-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}
        aria-label="Điều hướng không gian cá nhân"
        aria-modal={mobileMenuOpen ? "true" : undefined}
        role={mobileMenuOpen ? "dialog" : undefined}
        tabIndex={mobileMenuOpen ? -1 : undefined}
      >
        <a className="user-shell-brand" href="/dashboard">
          <span><img src="/logo.svg" alt="" width="30" height="30" /></span>
          <strong>MediMate</strong>
        </a>
        <button
          ref={drawerCloseButtonRef}
          className="mobile-drawer-close"
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X size={19} aria-hidden="true" />
        </button>

        <nav className="user-shell-nav" data-onboarding="patient-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isNavigationItemActive(item, path);
            const locked = isLocked(item.path);
            const content = (
              <>
                <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                {locked && <Lock className="nav-lock" size={14} strokeWidth={2.3} aria-hidden="true" />}
                {isActive && <ChevronRight className="nav-caret" size={16} strokeWidth={2.4} aria-hidden="true" />}
              </>
            );

            return locked ? (
              <button
                className={isActive ? "active" : ""}
                key={item.path}
                type="button"
                data-onboarding={`patient-nav-${item.id}`}
                aria-label={`${item.label}, yêu cầu MediMate+`}
                onClick={(event) => handleLockedNav(item.path, event.currentTarget)}
              >
                {content}
              </button>
            ) : (
              <a
                className={isActive ? "active" : ""}
                key={item.path}
                href={item.path}
                data-onboarding={`patient-nav-${item.id}`}
                aria-current={isActive ? "page" : undefined}
              >
                {content}
              </a>
            );
          })}
        </nav>

        {!premiumAccess && (
          <section className="user-shell-plan" aria-labelledby="medimate-plan-title">
            <span>MediMate+</span>
            <strong id="medimate-plan-title">Mở rộng quyền lợi sử dụng</strong>
            <p>Xem các quyền lợi và hạn mức MediMate+ hiện đang được cung cấp.</p>
            <button
              type="button"
              aria-label="Nâng cấp · Xem gói MediMate+"
              onClick={() => goTo("/pricing")}
            >
              Nâng cấp
            </button>
          </section>
        )}
      </aside>

      <main ref={mainRef} className="user-shell-main">
        <header className="user-shell-topbar">
          <div className="user-shell-title" data-onboarding="patient-title">
            <button
              className="icon-btn mobile-menu-btn"
              type="button"
              aria-label="Mở menu"
              aria-expanded={mobileMenuOpen}
              ref={mobileMenuButtonRef}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <span className="title-icon"><ActiveIcon size={19} strokeWidth={2.2} aria-hidden="true" /></span>
            <div>
              <p>Không gian cá nhân</p>
              <h1>{activeItem.label}</h1>
            </div>
          </div>

          <form className="user-shell-search" role="search" onSubmit={handleSearch} data-onboarding="patient-search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="workspace-search">Tìm cơ sở y tế</label>
            <input
              id="workspace-search"
              name="search"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm cơ sở y tế…"
              autoComplete="off"
            />
          </form>

          <div className="user-shell-actions">
            <div className="account-menu" ref={accountMenuRef}>
              <button
                ref={accountButtonRef}
                className="user-chip account-menu-trigger"
                type="button"
                data-onboarding="patient-account"
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
                aria-controls="workspace-account-menu"
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" width="32" height="32" referrerPolicy="no-referrer" />
                ) : (
                  <span>{getInitials(displayName)}</span>
                )}
                <strong>{displayName}</strong>
              </button>

              {accountMenuOpen && (
                <section
                  className="account-menu-panel"
                  id="workspace-account-menu"
                  aria-label="Menu tài khoản"
                >
                  <div className="account-menu-summary">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" width="38" height="38" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{getInitials(displayName)}</span>
                    )}
                    <div>
                      <strong>{displayName}</strong>
                      <small>{auth ? "Tài khoản MediMate" : "Chưa đăng nhập"}</small>
                    </div>
                  </div>

                  {auth ? (
                    <>
                      <button type="button" onClick={() => navigateFromAccount("/profile")}>
                        <UserRound size={17} aria-hidden="true" />
                        Hồ sơ
                      </button>
                      <div className="account-menu-preferences">
                        <Settings2 size={17} aria-hidden="true" />
                        <DisplayPreferences compact />
                      </div>
                      <button type="button" onClick={() => navigateFromAccount("/profile?tab=transactions")}>
                        <CreditCard size={17} aria-hidden="true" />
                        Lịch sử giao dịch
                      </button>
                      <button className="account-menu-danger" type="button" onClick={logout}>
                        <LogOut size={17} aria-hidden="true" />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => navigateFromAccount("/login?redirect=/dashboard")}>
                      <LogIn size={17} aria-hidden="true" />
                      Đăng nhập
                    </button>
                  )}
                </section>
              )}
            </div>
          </div>
        </header>

        <section className="user-shell-content">
          {children}
        </section>
      </main>

      <nav ref={mobileNavRef} className="user-shell-mobile-nav" aria-label="Điều hướng nhanh">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const locked = isLocked(item.path);
          return locked ? (
            <button
              className={path === item.path ? "active" : ""}
              key={item.path}
              type="button"
              aria-label={`${item.label}, yêu cầu MediMate+`}
              onClick={(event) => handleLockedNav(item.path, event.currentTarget)}
            >
              <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ) : (
            <a
              className={path === item.path ? "active" : ""}
              key={item.path}
              href={item.path}
              aria-current={path === item.path ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {notice && (
        <Dialog
          backdropClassName="app-notice-backdrop"
          className="app-notice"
          labelledBy="app-notice-title"
          describedBy="app-notice-description"
          initialFocusRef={noticeDeferButtonRef}
          restoreFocusRef={noticeTriggerRef}
          onClose={closeNotice}
        >
            <span className="app-notice-icon"><Crown size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="app-notice-title">{notice.title}</h2>
              <p id="app-notice-description">{notice.text}</p>
            </div>
            <div className="app-notice-actions">
              <button ref={noticeDeferButtonRef} type="button" onClick={closeNotice}>Để sau</button>
              <button type="button" onClick={openPricingFromNotice}>Xem bảng giá</button>
            </div>
        </Dialog>
      )}
      {shouldShowPatientSetup && (
        <PatientProfileSetupModal
          auth={setupAuth}
          onComplete={handlePatientSetupComplete}
        />
      )}
      <PatientOnboardingAssistant auth={auth} />
    </div>
  );
}
