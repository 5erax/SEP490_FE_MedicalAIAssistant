import { lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import UserWorkspaceShell from "../components/workspace/UserWorkspaceShell";
import { getStoredAuth, hasPremiumAccess } from "../services/api";

const LandingPage = lazy(() => import("../pages/LandingPage"));
const StaticPage = lazy(() => import("../pages/StaticPage"));
const WorkspaceRedirect = lazy(() => import("../pages/WorkspaceRedirect"));
const StaffWorkspacePage = lazy(() => import("../pages/StaffWorkspacePage"));
const AdminWorkspacePage = lazy(() => import("../pages/AdminWorkspacePage"));
const ChatbotPage = lazy(() => import("../pages/ChatbotPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const MedicalRecordPage = lazy(() => import("../pages/MedicalRecordPage"));
const MedicationScanPage = lazy(() => import("../pages/MedicationScanPage"));
const NearbyClinicPage = lazy(() => import("../pages/NearbyClinicPage"));
const PricingPage = lazy(() => import("../pages/PricingPage"));
const SymptomAnalysisPage = lazy(() => import("../pages/SymptomAnalysisPage"));
const UserProfilePage = lazy(() => import("../pages/UserProfilePage"));
const MedicalAssistantPage = lazy(() => import("../pages/MedicalAssistantPage"));
const PersonalPatientProfilePage = lazy(() => import("../pages/PersonalPatientProfilePage"));
const StaffRegisterPortalPage = lazy(() => import("../pages/StaffRegisterPortalPage"));

const LoginPage = lazy(() => import("../pages/AuthPages").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("../pages/AuthPages").then((module) => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() => import("../pages/AuthPages").then((module) => ({ default: module.ForgotPasswordPage })));
const ChangePasswordPage = lazy(() => import("../pages/AuthPages").then((module) => ({ default: module.ChangePasswordPage })));

function currentPath(location) {
  return `${location.pathname}${location.search || ""}`;
}

function loginPath(redirectPath) {
  return `/login?redirect=${encodeURIComponent(redirectPath)}`;
}

function pricingPath(lockedPath) {
  return `/pricing?locked=${encodeURIComponent(lockedPath)}`;
}

function UserWorkspaceRoute({ children }) {
  return <UserWorkspaceShell>{children}</UserWorkspaceShell>;
}

function RequireAuth({ children, redirectPath }) {
  const location = useLocation();
  const auth = getStoredAuth();

  if (!auth) {
    return <Navigate replace to={loginPath(redirectPath || currentPath(location))} />;
  }

  return children;
}

function RequirePremium({ children }) {
  const location = useLocation();
  const auth = getStoredAuth();

  if (!auth) {
    return <Navigate replace to={loginPath(currentPath(location))} />;
  }

  if (!hasPremiumAccess(auth)) {
    return <Navigate replace to={pricingPath(currentPath(location))} />;
  }

  return children;
}

function RedirectWithAuth({ to }) {
  // Preserve legacy redirects that changed the URL before checking auth.
  return (
    <RequireAuth redirectPath={to}>
      <Navigate replace to={to} />
    </RequireAuth>
  );
}

function StaticRoute() {
  const location = useLocation();
  return <StaticPage path={location.pathname} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/staff/register" element={<StaffRegisterPortalPage />} />
      <Route path="/staff-register" element={<StaffRegisterPortalPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route
        path="/dashboard"
        element={<UserWorkspaceRoute><DashboardPage /></UserWorkspaceRoute>}
      />
      <Route
        path="/profile"
        element={<RequirePremium><UserWorkspaceRoute><UserProfilePage /></UserWorkspaceRoute></RequirePremium>}
      />
      <Route
        path="/symptom"
        element={<RequirePremium><UserWorkspaceRoute><SymptomAnalysisPage /></UserWorkspaceRoute></RequirePremium>}
      />
      <Route
        path="/chat"
        element={<RequirePremium><UserWorkspaceRoute><ChatbotPage /></UserWorkspaceRoute></RequirePremium>}
      />
      <Route path="/map" element={<NearbyClinicPage />} />
      <Route
        path="/records"
        element={<RequirePremium><UserWorkspaceRoute><MedicalRecordPage /></UserWorkspaceRoute></RequirePremium>}
      />
      <Route
        path="/medication"
        element={<RequirePremium><UserWorkspaceRoute><MedicationScanPage /></UserWorkspaceRoute></RequirePremium>}
      />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/app" element={<WorkspaceRedirect />} />
      <Route path="/account" element={<RedirectWithAuth to="/dashboard" />} />
      <Route path="/app/patient" element={<RedirectWithAuth to="/dashboard" />} />
      <Route path="/app/staff" element={<RequireAuth><StaffWorkspacePage /></RequireAuth>} />
      <Route path="/app/admin" element={<RequireAuth><AdminWorkspacePage /></RequireAuth>} />
      <Route path="/medical-assistant" element={<MedicalAssistantPage />} />
      <Route path="/symptom-chat" element={<MedicalAssistantPage />} />
      <Route
        path="/patient/profile/setup"
        element={<RequireAuth><PersonalPatientProfilePage /></RequireAuth>}
      />
      <Route path="/departments" element={<Navigate replace to="/" />} />
      <Route path="/admin" element={<RequireAuth><AdminWorkspacePage /></RequireAuth>} />
      <Route path="/admin/users" element={<RequireAuth><AdminWorkspacePage /></RequireAuth>} />
      <Route path="*" element={<StaticRoute />} />
    </Routes>
  );
}
