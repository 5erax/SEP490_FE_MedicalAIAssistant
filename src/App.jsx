import LandingPage from "./pages/LandingPage";
import StaticPage from "./pages/StaticPage";
import WorkspaceRedirect from "./pages/WorkspaceRedirect";
import PatientWorkspacePage from "./pages/PatientWorkspacePage";
import StaffWorkspacePage from "./pages/StaffWorkspacePage";
import AdminWorkspacePage from "./pages/AdminWorkspacePage";
import ChatbotPage from "./pages/ChatbotPage";
import DashboardPage from "./pages/DashboardPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import MedicalRecordPage from "./pages/MedicalRecordPage";
import MedicationScanPage from "./pages/MedicationScanPage";
import NearbyClinicPage from "./pages/NearbyClinicPage";
import PricingPage from "./pages/PricingPage";
import SymptomAnalysisPage from "./pages/SymptomAnalysisPage";
import UserProfilePage from "./pages/UserProfilePage";
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  SignupPage,
} from "./pages/AuthPages";

function App() {
  const path = window.location.pathname;

  if (path === "/") {
    return <LandingPage />;
  }

  if (path === "/login") return <LoginPage />;
  if (path === "/signup") return <SignupPage />;
  if (path === "/forgot-password") return <ForgotPasswordPage />;
  if (path === "/change-password") return <ChangePasswordPage />;
  if (path === "/dashboard") return <DashboardPage />;
  if (path === "/profile") return <UserProfilePage />;
  if (path === "/symptom") return <SymptomAnalysisPage />;
  if (path === "/chat") return <ChatbotPage />;
  if (path === "/map") return <NearbyClinicPage />;
  if (path === "/records") return <MedicalRecordPage />;
  if (path === "/medication") return <MedicationScanPage />;
  if (path === "/pricing") return <PricingPage />;
  if (path === "/app") return <WorkspaceRedirect />;
  if (path === "/account" || path === "/app/patient") return <PatientWorkspacePage />;
  if (path === "/app/staff") return <StaffWorkspacePage />;
  if (path === "/app/admin") return <AdminWorkspacePage />;
  if (path === "/departments") return <DepartmentsPage />;
  if (path === "/admin" || path === "/admin/users") return <AdminWorkspacePage />;

  return <StaticPage path={path} />;
}

export default App;
