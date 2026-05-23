import {
  Activity,
  Bell,
  Bot,
  ChevronRight,
  Crown,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Pill,
  Search,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { clearStoredAuth, getStoredAuth } from "../../services/api";
import "../../styles/user-workspace.css";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Tư vấn chuyên khoa", icon: LayoutDashboard, hint: "Gợi ý nơi khám" },
  { path: "/symptom", label: "Triệu chứng", icon: Activity, hint: "Phân tích nhanh" },
  { path: "/chat", label: "Chat AI", icon: Bot, hint: "Hỏi trợ lý" },
  { path: "/map", label: "Bản đồ", icon: MapPin, hint: "Cơ sở gần bạn" },
  { path: "/profile", label: "Hồ sơ", icon: UserRound, hint: "Thông tin cá nhân" },
  { path: "/records", label: "Y bạ", icon: FileText, hint: "Kết quả & tài liệu" },
  { path: "/medication", label: "Thuốc", icon: Pill, hint: "Quét & kiểm tra" },
  { path: "/pricing", label: "MediMate+", icon: Crown, hint: "Nâng cấp" },
];

const FREE_PATHS = new Set(["/dashboard", "/map", "/pricing"]);

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5);

function goTo(path) {
  window.location.href = path;
}

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

export default function UserWorkspaceShell({ children }) {
  const [notice, setNotice] = useState(null);
  const auth = getStoredAuth();
  const path = getCurrentPath();
  const activeItem = NAV_ITEMS.find((item) => path === item.path) ?? NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;
  const displayName = auth?.displayName || auth?.name || auth?.email || "Người dùng";

  function logout() {
    clearStoredAuth();
    goTo("/");
  }

  function handleNav(pathToOpen) {
    if (!FREE_PATHS.has(pathToOpen)) {
      setNotice({
        title: "Cần nâng cấp MediMate+",
        text: "Tính năng này nằm trong gói nâng cao. Bạn có thể xem bảng giá hoặc quay lại tư vấn chuyên khoa.",
      });
      return;
    }

    goTo(pathToOpen);
  }

  function openPricingFromNotice() {
    setNotice(null);
    goTo("/pricing");
  }

  return (
    <div className="user-shell">
      <aside className="user-shell-sidebar" aria-label="Điều hướng không gian cá nhân">
        <a className="user-shell-brand" href="/dashboard">
          <span>+</span>
          <strong>MediMate</strong>
        </a>

        <nav className="user-shell-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = path === item.path;
            return (
              <button
                className={isActive ? "active" : ""}
                key={item.path}
                type="button"
                onClick={() => handleNav(item.path)}
              >
                <Icon size={18} strokeWidth={2.2} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </span>
                {!FREE_PATHS.has(item.path) && <Lock className="nav-lock" size={14} strokeWidth={2.3} />}
                {isActive && <ChevronRight className="nav-caret" size={16} strokeWidth={2.4} />}
              </button>
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

      <main className="user-shell-main">
        <header className="user-shell-topbar">
          <div className="user-shell-title">
            <button className="icon-btn mobile-menu-btn" type="button" aria-label="Mở menu">
              <Menu size={19} />
            </button>
            <span className="title-icon"><ActiveIcon size={19} strokeWidth={2.2} /></span>
            <div>
              <p>Không gian cá nhân</p>
              <h1>{activeItem.label}</h1>
            </div>
          </div>

          <div className="user-shell-search" aria-label="Tìm kiếm nhanh">
            <Search size={17} />
            <input placeholder="Tìm hồ sơ, cơ sở y tế, thuốc..." />
          </div>

          <div className="user-shell-actions">
            <button className="icon-btn" type="button" aria-label="Thông báo">
              <Bell size={18} />
            </button>
            <button className="user-chip" type="button" onClick={() => goTo("/profile")}>
              <span>{getInitials(displayName)}</span>
              <strong>{displayName}</strong>
            </button>
            <button className="logout-btn" type="button" onClick={logout}>
              <LogOut size={17} />
              Đăng xuất
            </button>
          </div>
        </header>

        <section className="user-shell-content">
          {children}
        </section>
      </main>

      <nav className="user-shell-mobile-nav" aria-label="Điều hướng nhanh">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={path === item.path ? "active" : ""}
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
            >
              <Icon size={19} strokeWidth={2.2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {notice && (
        <div className="app-notice-backdrop" role="presentation" onClick={() => setNotice(null)}>
          <section
            className="app-notice"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-notice-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="app-notice-icon"><Crown size={20} /></span>
            <div>
              <h2 id="app-notice-title">{notice.title}</h2>
              <p>{notice.text}</p>
            </div>
            <div className="app-notice-actions">
              <button type="button" onClick={() => setNotice(null)}>Để sau</button>
              <button type="button" onClick={openPricingFromNotice}>Xem bảng giá</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
