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
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  SignupPage,
} from "./pages/AuthPages";

function userWorkspace(page) {
  return <UserWorkspaceShell>{page}</UserWorkspaceShell>;
}

function App() {
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
  if (path === "/profile") return userWorkspace(<UserProfilePage />);
  if (path === "/symptom") return userWorkspace(<SymptomAnalysisPage />);
  if (path === "/chat") return userWorkspace(<ChatbotPage />);
  if (path === "/map") return <NearbyClinicPage />;
  if (path === "/records") return userWorkspace(<MedicalRecordPage />);
  if (path === "/medication") return userWorkspace(<MedicationScanPage />);
  if (path === "/pricing") return <PricingPage />;
  if (path === "/app") return <WorkspaceRedirect />;
  if (path === "/account" || path === "/app/patient") {
    window.history.replaceState(null, "", "/dashboard");
    return userWorkspace(<DashboardPage />);
  }
  if (path === "/app/staff") return <StaffWorkspacePage />;
  if (path === "/app/admin") return <AdminWorkspacePage />;
  if (path === "/medical-assistant" || path === "/symptom-chat") return <MedicalAssistantPage />;
  if (path === "/patient/profile/setup") return <PersonalPatientProfilePage />;
  if (path === "/departments") {
    window.history.replaceState(null, "", "/");
    return <LandingPage />;
  }
  if (path === "/admin" || path === "/admin/users") return <AdminWorkspacePage />;

  return <StaticPage path={path} />;
}

export default App;
