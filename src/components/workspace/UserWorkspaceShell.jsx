import {
  Activity,
  Bell,
  Bot,
  ChevronRight,
  Crown,
  CreditCard,
  FileText,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Pill,
  ClipboardCheck,
  Search,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { navigate as goTo } from "../../router/navigation";
import { withReturnTo } from "../../router/returnIntent";
import { getNavigationModel } from "../../router/routes";
import { authApi, getStoredAuth, hasPremiumAccess } from "../../services/api";
import { logoutUser } from "../../services/logoutService";
import "../../styles/user-workspace.css";
import DisplayPreferences from "../preferences/DisplayPreferences";
import { Dialog, useOverlayFocus } from "../ui";

const PATIENT_ICONS = {
  dashboard: LayoutDashboard,
  symptom: Activity,
  chat: Bot,
  map: MapPin,
  profile: UserRound,
  records: FileText,
  medication: Pill,
  recovery: ClipboardCheck,
};

const NAV_ITEMS = getNavigationModel("patient").map((item) => ({
  ...item,
  icon: PATIENT_ICONS[item.icon],
}));

const MOBILE_ITEMS = NAV_ITEMS.filter((item) => item.mobile);

function getCurrentPath() {
  return window.location.pathname;
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

export default function UserWorkspaceShell({ children }) {
  const [notice, setNotice] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountUser, setAccountUser] = useState(null);
  const [searchText, setSearchText] = useState("");
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
    ?? (path === "/profile" ? { label: "Hồ sơ", icon: UserRound } : NAV_ITEMS[0]);
  const ActiveIcon = activeItem.icon;
  const visibleAccountUser = accessToken ? accountUser : null;
  const displayName = getAccountName(visibleAccountUser, auth);
  const avatarUrl = getAccountAvatar(visibleAccountUser);

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
          : "Bạn vẫn có thể dùng tư vấn chuyên khoa và bản đồ. Những phần lưu hồ sơ, y bạ, thuốc và chat nâng cao cần đăng ký rồi nâng cấp MediMate+.",
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

    authApi.me()
      .then((response) => {
        if (active) setAccountUser(response.data ?? null);
      })
      .catch(() => {
        if (active) setAccountUser(null);
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
          <span>+</span>
          <strong>MediMate</strong>
        </a>
        <button
          ref={drawerCloseButtonRef}
          className="mobile-drawer-close"
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X size={19} />
        </button>

        <nav className="user-shell-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.path;
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
                aria-current={isActive ? "page" : undefined}
              >
                {content}
              </a>
            );
          })}
        </nav>

        <section className="user-shell-plan">
          <span>MediMate+</span>
          <strong>Chăm sóc sâu hơn</strong>
          <p>Mở khoá theo dõi sức khoẻ, thuốc và tư vấn sau khám.</p>
          <button type="button" onClick={() => goTo("/pricing")}>Nâng cấp</button>
        </section>
      </aside>

      <main ref={mainRef} className="user-shell-main">
        <header className="user-shell-topbar">
          <div className="user-shell-title">
            <button
              className="icon-btn mobile-menu-btn"
              type="button"
              aria-label="Mở menu"
              aria-expanded={mobileMenuOpen}
              ref={mobileMenuButtonRef}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={19} />
            </button>
            <span className="title-icon"><ActiveIcon size={19} strokeWidth={2.2} /></span>
            <div>
              <p>Không gian cá nhân</p>
              <h1>{activeItem.label}</h1>
            </div>
          </div>

          <form className="user-shell-search" role="search" onSubmit={handleSearch}>
            <Search size={17} />
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
            {auth && (
              <button className="icon-btn" type="button" aria-label="Thông báo">
                <Bell size={18} />
              </button>
            )}
            <div className="account-menu" ref={accountMenuRef}>
              <button
                ref={accountButtonRef}
                className="user-chip account-menu-trigger"
                type="button"
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
                aria-controls="workspace-account-menu"
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
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
                      <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
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
                      <button type="button" onClick={() => navigateFromAccount("/profile?tab=subscription")}>
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
            <span className="app-notice-icon"><Crown size={20} /></span>
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
    </div>
  );
}
