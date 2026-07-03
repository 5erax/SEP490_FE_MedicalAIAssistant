import { lazy, Suspense, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import UserWorkspaceShell from "./components/workspace/UserWorkspaceShell";
import StaticPage from "./pages/StaticPage";
import WorkspaceRedirect from "./pages/WorkspaceRedirect";
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

const NearbyClinicPage = lazy(() => import("./pages/NearbyClinicPage"));
const MedicalAssistantPage = lazy(() => import("./pages/MedicalAssistantPage"));
const AdminWorkspacePage = lazy(() => import("./pages/AdminWorkspacePage"));
const ChatbotPage = lazy(() => import("./pages/ChatbotPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DoctorRegisterInvitationPage = lazy(() => import("./pages/DoctorRegisterInvitationPage"));
const MedicalRecordPage = lazy(() => import("./pages/MedicalRecordPage"));
const MedicationScanPage = lazy(() => import("./pages/MedicationScanPage"));
const PaymentResultPage = lazy(() => import("./pages/PaymentResultPage"));
const PersonalPatientProfilePage = lazy(() => import("./pages/PersonalPatientProfilePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const RecoveryPlanPage = lazy(() => import("./pages/RecoveryPlanPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));

function userWorkspace(page) {
  return <UserWorkspaceShell>{page}</UserWorkspaceShell>;
}

function lazyPage(page) {
  return (
    <Suspense fallback={(
      <main className="workspace-root" data-route-loading>
        <section className="app-page">
          <div className="container app-empty" role="status">
            <p className="eyebrow">Đang tải</p>
            <h1>Đang chuẩn bị nội dung...</h1>
          </div>
        </section>
      </main>
    )}
    >
      {page}
    </Suspense>
  );
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

  const requestedPath = `${canonicalPath || path}${window.location.search}${window.location.hash}`;
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
      return lazyPage(<DoctorRegisterInvitationPage />);
    case "auth.forgot-password":
      return <ForgotPasswordPage />;
    case "auth.change-password":
      return <ChangePasswordPage />;
    case "patient.dashboard":
      return userWorkspace(lazyPage(<DashboardPage />));
    case "patient.profile":
      return userWorkspace(lazyPage(<UserProfilePage />));
    case "assistant.intake":
      return userWorkspace(lazyPage(<MedicalAssistantPage mode="intake" />));
    case "patient.chat":
      return userWorkspace(lazyPage(<ChatbotPage />));
    case "public.map":
      return lazyPage(<NearbyClinicPage />);
    case "patient.records":
      return userWorkspace(lazyPage(<MedicalRecordPage />));
    case "patient.recovery":
      return userWorkspace(lazyPage(<RecoveryPlanPage />));
    case "patient.medication":
      return userWorkspace(lazyPage(<MedicationScanPage />));
    case "public.pricing":
      return lazyPage(<PricingPage />);
    case "payment.return":
      return lazyPage(<PaymentResultPage expectedResult="return" />);
    case "payment.cancel":
      return lazyPage(<PaymentResultPage expectedResult="cancel" />);
    case "workspace.redirect":
      return <WorkspaceRedirect />;
    case "assistant.main":
      return lazyPage(<MedicalAssistantPage mode="entry" />);
    case "assistant.safety":
      return lazyPage(<MedicalAssistantPage mode="safety" />);
    case "assessment.session":
      return userWorkspace(lazyPage(<MedicalAssistantPage mode="questions" sessionId={route.params?.sessionId} />));
    case "assessment.result":
      return userWorkspace(lazyPage(<MedicalAssistantPage mode="result" sessionId={route.params?.sessionId} />));
    case "assessment.history":
      return userWorkspace(lazyPage(<MedicalAssistantPage mode="history" />));
    case "patient.profile-setup":
      return lazyPage(<PersonalPatientProfilePage />);
    default:
      if (route.id.startsWith("admin.")) {
        return lazyPage(<AdminWorkspacePage initialSection={route.section} />);
      }
      return <StaticPage path={path} />;
  }
}

export default App;
