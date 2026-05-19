import LandingPage from "./pages/LandingPage";
import StaticPage from "./pages/StaticPage";
import WorkspaceRedirect from "./pages/WorkspaceRedirect";
import PatientWorkspacePage from "./pages/PatientWorkspacePage";
import StaffWorkspacePage from "./pages/StaffWorkspacePage";
import AdminWorkspacePage from "./pages/AdminWorkspacePage";
import MedicalAssistantPage from "./pages/MedicalAssistantPage";
import DepartmentsPage from "./pages/DepartmentsPage";
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
  if (path === "/app") return <WorkspaceRedirect />;
  if (path === "/account" || path === "/app/patient") return <PatientWorkspacePage />;
  if (path === "/app/staff") return <StaffWorkspacePage />;
  if (path === "/app/admin") return <AdminWorkspacePage />;
  if (path === "/medical-assistant" || path === "/symptom-chat") return <MedicalAssistantPage />;
  if (path === "/departments") return <DepartmentsPage />;
  if (path === "/admin" || path === "/admin/users") return <AdminWorkspacePage />;

  return <StaticPage path={path} />;
}

export default App;
