import {
  ArrowRight,
  CircleHelp,
  ClipboardList,
  Home,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, ErrorState, LoadingState } from "../components/ui";
import { navigate } from "../router/navigation";
import { authApi, getStoredAuth } from "../services/api";
import { logoutUser } from "../services/logoutService";
import { hasRole, normalizeRoles } from "../utils/roles";
import "../styles/staff-workspace.css";

function readRoles(profile, auth) {
  return normalizeRoles(profile?.roles ?? profile?.role ?? auth?.roles ?? auth?.role ?? []);
}

function getRoleLabel(roles) {
  if (hasRole(roles, "admin")) return "Admin";
  if (hasRole(roles, "staff")) return "Staff";
  if (hasRole(roles, "doctor")) return "Doctor";
  return "Tài khoản";
}

function getAccountStatus(profile) {
  if (!profile) return "Theo phiên đăng nhập";
  if (profile.isDeleted) return "Đã xóa";
  if (profile.isActive === false) return "Tạm ngưng";
  if (profile.emailConfirmed === false || profile.isConfirmed === false) return "Chưa xác nhận";
  return "Đang hoạt động";
}

export default function StaffWorkspacePage() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authApi.me();
      setProfile(response.data ?? {});
    } catch {
      setError("Không thể đồng bộ thông tin tài khoản. Phiên đăng nhập vẫn được giữ để bạn thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) return undefined;
    let active = true;

    authApi.me()
      .then((response) => {
        if (active) setProfile(response.data ?? {});
      })
      .catch(() => {
        if (active) {
          setError("Không thể đồng bộ thông tin tài khoản. Phiên đăng nhập vẫn được giữ để bạn thử lại.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [auth, loadProfile]);

  const roles = useMemo(() => readRoles(profile, auth), [auth, profile]);
  const roleLabel = getRoleLabel(roles);
  const displayName = profile?.displayName || profile?.fullName || profile?.name
    || auth?.displayName || auth?.fullName || auth?.name || "Thành viên MediMate";
  const email = profile?.email || auth?.email || "Chưa có email";
  const hasOperatorAccess = hasRole(roles, "doctor") || hasRole(roles, "staff") || hasRole(roles, "admin");

  async function handleLogout() {
    await logoutUser({ onClear: () => setAuth(null), redirect: navigate });
  }

  if (!auth) return null;

  return (
    <main className="staff-workspace" id="main-content" tabIndex="-1">
      <a className="skip-link" href="#staff-content">Bỏ qua đến nội dung chính</a>

      <header className="staff-workspace-header">
        <a className="brand" href="/" aria-label="MediMate AI - Trang chủ">
          <span className="brand-mark" aria-hidden="true">
            <img src="/logo.svg" alt="" width="36" height="36" />
          </span>
          <span>MediMate AI</span>
        </a>
        <div className="staff-account-actions">
          <span className="staff-role-badge"><ShieldCheck size={15} aria-hidden="true" /> {roleLabel}</span>
          <Button tone="ghost" size="sm" onClick={handleLogout}>Đăng xuất</Button>
        </div>
      </header>

      <div className="staff-workspace-content" id="staff-content">
        <section className="staff-workspace-hero" aria-labelledby="staff-workspace-title">
          <div>
            <p className="eyebrow">Không gian Doctor và Staff</p>
            <h1 id="staff-workspace-title">Xin chào, {displayName}.</h1>
            <p>
              Tài khoản đã được chuyển đến đúng khu vực làm việc theo vai trò đã xác nhận.
            </p>
          </div>
          <span className="staff-hero-icon" aria-hidden="true"><Stethoscope size={34} /></span>
        </section>

        {loading ? (
          <LoadingState
            className="staff-account-state"
            label="Đang đồng bộ tài khoản…"
            description="MediMate đang xác nhận vai trò và trạng thái truy cập của bạn."
          />
        ) : !hasOperatorAccess ? (
          <ErrorState
            className="staff-account-state"
            urgent
            title="Tài khoản không có quyền Doctor hoặc Staff"
            description="Tài khoản của bạn không có quyền truy cập khu vực này. Hãy đăng xuất và liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn."
            action={<Button onClick={handleLogout}>Đăng xuất an toàn</Button>}
          />
        ) : (
          <div className="staff-workspace-grid">
            <section className="staff-account-panel" aria-labelledby="staff-account-title">
              <div className="staff-section-heading">
                <div>
                  <p className="eyebrow">Tài khoản đã xác minh</p>
                  <h2 id="staff-account-title">Thông tin truy cập</h2>
                </div>
                <span className="staff-status-badge">{getAccountStatus(profile)}</span>
              </div>

              {error && (
                <ErrorState
                  title="Chưa đồng bộ được dữ liệu mới nhất"
                  description={error}
                  action={<Button onClick={loadProfile}><RefreshCw size={16} aria-hidden="true" /> Thử tải lại</Button>}
                />
              )}

              <dl className="staff-account-details">
                <div><dt>Tên hiển thị</dt><dd>{displayName}</dd></div>
                <div><dt>Email</dt><dd>{email}</dd></div>
                <div><dt>Vai trò</dt><dd>{roleLabel}</dd></div>
                <div><dt>Phạm vi truy cập</dt><dd>Workspace Doctor / Staff</dd></div>
              </dl>

              <Alert tone="info" title="Dữ liệu được bảo vệ">
                MediMate chỉ hiển thị thông tin hiện có của tài khoản và không suy đoán dữ liệu chuyên môn hoặc bệnh nhân.
              </Alert>
            </section>

            <aside className="staff-quick-panel" aria-labelledby="staff-quick-title">
              <div className="staff-section-heading">
                <div>
                  <p className="eyebrow">Điều hướng</p>
                  <h2 id="staff-quick-title">Truy cập nhanh</h2>
                </div>
              </div>
              <nav className="staff-quick-links" aria-label="Liên kết nhanh Doctor và Staff">
                {hasRole(roles, "doctor") && (
                  <a href="/app/staff/recovery-plans/queue">
                    <span><ClipboardList size={20} aria-hidden="true" /></span>
                    <div><strong>Hàng đợi Kế hoạch phục hồi</strong><small>Nhận và xử lý yêu cầu bệnh nhân</small></div>
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                )}
                <a href="/map">
                  <span><MapPin size={20} aria-hidden="true" /></span>
                  <div><strong>Tìm cơ sở y tế</strong><small>Xem cơ sở đang hoạt động trên bản đồ</small></div>
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a href="/support">
                  <span><CircleHelp size={20} aria-hidden="true" /></span>
                  <div><strong>Trung tâm hỗ trợ</strong><small>Xem hướng dẫn và kênh liên hệ MediMate</small></div>
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <a href="/">
                  <span><Home size={20} aria-hidden="true" /></span>
                  <div><strong>Về trang chủ</strong><small>Trở lại khu vực công khai của MediMate</small></div>
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </nav>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
