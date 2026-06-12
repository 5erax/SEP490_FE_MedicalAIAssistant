import LandingPage from "./pages/LandingPage";
import UserWorkspaceShell from "./components/workspace/UserWorkspaceShell";
import StaticPage from "./pages/StaticPage";
import WorkspaceRedirect from "./pages/WorkspaceRedirect";
import StaffWorkspacePage from "./pages/StaffWorkspacePage";
import AdminWorkspacePage from "./pages/AdminWorkspacePage";
import ChatbotPage from "./pages/ChatbotPage";
import DashboardPage from "./pages/DashboardPage";
import MedicalRecordPage from "./pages/MedicalRecordPage";
import MedicationScanPage from "./pages/MedicationScanPage";
import NearbyClinicPage from "./pages/NearbyClinicPage";
import PricingPage from "./pages/PricingPage";
import PaymentResultPage from "./pages/PaymentResultPage";
import SymptomAnalysisPage from "./pages/SymptomAnalysisPage";
import UserProfilePage from "./pages/UserProfilePage";
import MedicalAssistantPage from "./pages/MedicalAssistantPage";
import PersonalPatientProfilePage from "./pages/PersonalPatientProfilePage";
import StaffRegisterPortalPage from "./pages/StaffRegisterPortalPage";
import DoctorRegisterInvitationPage from "./pages/DoctorRegisterInvitationPage";
import { getStoredAuth, hasPremiumAccess } from "./services/api";
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  SignupPage,
} from "./pages/AuthPages";

function userWorkspace(page) {
  return <UserWorkspaceShell>{page}</UserWorkspaceShell>;
}

function safeCurrentPath() {
  return `${window.location.pathname}${window.location.search || ""}`;
}

const PAGE_TITLES = {
  "/": "MediMate AI | Trợ lý sức khỏe",
  "/login": "Đăng nhập | MediMate AI",
  "/signup": "Tạo tài khoản | MediMate AI",
  "/register-doctor": "Đăng ký bác sĩ | MediMate AI",
  "/staff/register": "Đăng ký nhân viên | MediMate AI",
  "/staff-register": "Đăng ký nhân viên | MediMate AI",
  "/forgot-password": "Khôi phục mật khẩu | MediMate AI",
  "/change-password": "Đổi mật khẩu | MediMate AI",
  "/dashboard": "Tư vấn chuyên khoa | MediMate AI",
  "/profile": "Hồ sơ cá nhân | MediMate AI",
  "/symptom": "Phân tích triệu chứng | MediMate AI",
  "/chat": "Chat với trợ lý AI | MediMate AI",
  "/map": "Tìm cơ sở y tế | MediMate AI",
  "/records": "Hồ sơ y tế | MediMate AI",
  "/medication": "Kiểm tra thuốc | MediMate AI",
  "/pricing": "Bảng giá | MediMate AI",
  "/payment/return": "Thanh toán thành công | MediMate AI",
  "/payment/cancel": "Thanh toán đã hủy | MediMate AI",
  "/app": "Không gian làm việc | MediMate AI",
  "/app/staff": "Không gian nhân viên | MediMate AI",
  "/app/admin": "Quản trị hệ thống | MediMate AI",
  "/admin": "Quản trị hệ thống | MediMate AI",
  "/admin/users": "Quản lý người dùng | MediMate AI",
};

function updateDocumentMetadata(path) {
  document.title = PAGE_TITLES[path] ?? "MediMate AI";
}

function redirectToLogin(path) {
  const redirect = encodeURIComponent(path || safeCurrentPath());
  window.history.replaceState(null, "", `/login?redirect=${redirect}`);
  return <LoginPage />;
}

function redirectToPricing(path) {
  const locked = encodeURIComponent(path || safeCurrentPath());
  window.history.replaceState(null, "", `/pricing?locked=${locked}`);
  return <PricingPage />;
}

function requireAuth(page, path) {
  const auth = getStoredAuth();
  if (!auth) return redirectToLogin(path);
  return page;
}

function requirePremium(page, path) {
  const auth = getStoredAuth();
  if (!auth) return redirectToLogin(path);
  if (!hasPremiumAccess(auth)) return redirectToPricing(path);
  return page;
}

function App() {
  const path = window.location.pathname;
  updateDocumentMetadata(path);

  if (path === "/") {
    return <LandingPage />;
  }

  if (path === "/login") return <LoginPage />;
  if (path === "/signup") return <SignupPage />;
  if (path === "/register-doctor") return <DoctorRegisterInvitationPage />;
  if (path === "/staff/register" || path === "/staff-register") return <StaffRegisterPortalPage />;
  if (path === "/forgot-password") return <ForgotPasswordPage />;
  if (path === "/change-password") return <ChangePasswordPage />;
  if (path === "/dashboard") return userWorkspace(<DashboardPage />);
  if (path === "/profile") return requirePremium(userWorkspace(<UserProfilePage />), safeCurrentPath());
  if (path === "/symptom") return requirePremium(userWorkspace(<SymptomAnalysisPage />), safeCurrentPath());
  if (path === "/chat") return requirePremium(userWorkspace(<ChatbotPage />), safeCurrentPath());
  if (path === "/map") return <NearbyClinicPage />;
  if (path === "/records") return requirePremium(userWorkspace(<MedicalRecordPage />), safeCurrentPath());
  if (path === "/medication") return requirePremium(userWorkspace(<MedicationScanPage />), safeCurrentPath());
  if (path === "/pricing") return <PricingPage />;
  if (path === "/payment/return") return <PaymentResultPage expectedResult="return" />;
  if (path === "/payment/cancel") return <PaymentResultPage expectedResult="cancel" />;
  if (path === "/app") return <WorkspaceRedirect />;
  if (path === "/account" || path === "/app/patient") {
    window.history.replaceState(null, "", "/dashboard");
    return requireAuth(userWorkspace(<DashboardPage />), "/dashboard");
  }
  if (path === "/app/staff") return <StaffWorkspacePage />;
  if (path === "/app/admin") return <AdminWorkspacePage />;
  if (path === "/medical-assistant" || path === "/symptom-chat") return <MedicalAssistantPage />;
  if (path === "/patient/profile/setup") return requireAuth(<PersonalPatientProfilePage />, safeCurrentPath());
  if (path === "/departments") {
    window.history.replaceState(null, "", "/");
    return <LandingPage />;
  }
  if (path === "/admin" || path === "/admin/users") return <AdminWorkspacePage />;

  return <StaticPage path={path} />;
}

export default App;
