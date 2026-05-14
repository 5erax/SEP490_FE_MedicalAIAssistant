import LandingPage from "./pages/LandingPage";
import StaticPage from "./pages/StaticPage";
import AccountPage from "./pages/AccountPage";
import AdminUsersPage from "./pages/AdminUsersPage";
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
  if (path === "/app" || path === "/account") return <AccountPage />;
  if (path === "/departments") return <DepartmentsPage />;
  if (path === "/admin/users") return <AdminUsersPage />;

  return <StaticPage path={path} />;
}

export default App;
