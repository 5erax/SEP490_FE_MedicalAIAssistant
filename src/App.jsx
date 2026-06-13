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
import PaymentResultPage from "./pages/PaymentResultPage";
import SymptomAnalysisPage from "./pages/SymptomAnalysisPage";
import UserProfilePage from "./pages/UserProfilePage";
import MedicalAssistantPage from "./pages/MedicalAssistantPage";
import PersonalPatientProfilePage from "./pages/PersonalPatientProfilePage";
import StaffRegisterPortalPage from "./pages/StaffRegisterPortalPage";
import DoctorRegisterInvitationPage from "./pages/DoctorRegisterInvitationPage";
import { getStoredAuth } from "./services/api";
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  SignupPage,
} from "./pages/AuthPages";
import { getCanonicalPath, resolveRoute } from "./router/routes";
import { replaceRoute } from "./router/navigation";
import { resolveRouteAccess } from "./router/access";

function userWorkspace(page) {
  return <UserWorkspaceShell>{page}</UserWorkspaceShell>;
}

function RouteRedirect({ to, children }) {
  useEffect(() => {
    replaceRoute(to);
  }, [to]);

  return children ?? null;
}

function App() {
  const path = window.location.pathname;
  const route = resolveRoute(path);
  const canonicalPath = getCanonicalPath(route);

  useEffect(() => {
    document.title = route?.title ?? "MediMate AI";

    const canCanonicalize = route?.access !== "auth" || Boolean(getStoredAuth());
    if (canCanonicalize && canonicalPath && canonicalPath !== path && window.location.pathname === path) {
      window.history.replaceState(null, "", `${canonicalPath}${window.location.search}${window.location.hash}`);
    }
  }, [canonicalPath, path, route]);

  if (!route) return <StaticPage path={path} />;

  const requestedPath = canonicalPath || path;
  const redirectPath = resolveRouteAccess(route, getStoredAuth(), requestedPath);
  if (redirectPath) {
    return <RouteRedirect to={redirectPath} />;
  }

  switch (route.id) {
    case "public.home":
    case "public.departments":
      return <LandingPage />;
    case "auth.login":
      return <LoginPage />;
    case "auth.signup":
      return <SignupPage />;
    case "auth.doctor-register":
      return <DoctorRegisterInvitationPage />;
    case "auth.staff-register":
      return <StaffRegisterPortalPage />;
    case "auth.forgot-password":
      return <ForgotPasswordPage />;
    case "auth.change-password":
      return <ChangePasswordPage />;
    case "patient.dashboard":
      return userWorkspace(<DashboardPage />);
    case "patient.profile":
      return userWorkspace(<UserProfilePage />);
    case "patient.symptom":
      return userWorkspace(<SymptomAnalysisPage />);
    case "patient.chat":
      return userWorkspace(<ChatbotPage />);
    case "public.map":
      return <NearbyClinicPage />;
    case "patient.records":
      return userWorkspace(<MedicalRecordPage />);
    case "patient.medication":
      return userWorkspace(<MedicationScanPage />);
    case "public.pricing":
      return <PricingPage />;
    case "payment.return":
      return <PaymentResultPage expectedResult="return" />;
    case "payment.cancel":
      return <PaymentResultPage expectedResult="cancel" />;
    case "workspace.redirect":
      return <WorkspaceRedirect />;
    case "workspace.staff":
      return <StaffWorkspacePage />;
    case "assistant.main":
      return <MedicalAssistantPage />;
    case "patient.profile-setup":
      return <PersonalPatientProfilePage />;
    default:
      if (route.id.startsWith("admin.")) {
        return <AdminWorkspacePage initialSection={route.section} />;
      }
      return <StaticPage path={path} />;
  }
}

export default App;
