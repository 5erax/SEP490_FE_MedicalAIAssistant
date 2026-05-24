import { useEffect } from "react";
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
import SymptomAnalysisPage from "./pages/SymptomAnalysisPage";
import UserProfilePage from "./pages/UserProfilePage";
import MedicalAssistantPage from "./pages/MedicalAssistantPage";
import PersonalPatientProfilePage from "./pages/PersonalPatientProfilePage";
import StaffRegisterPortalPage from "./pages/StaffRegisterPortalPage";
import { authApi, clearStoredAuth, getStoredAuth, hasPremiumAccess, hasStoredAuthRecord } from "./services/api";
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

const AUTH_REFRESH_INTERVAL_MS = 7 * 60 * 1000;

function App() {
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

  const path = window.location.pathname;

  if (path === "/") {
    return <LandingPage />;
  }

  if (path === "/login") return <LoginPage />;
  if (path === "/signup") return <SignupPage />;
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
