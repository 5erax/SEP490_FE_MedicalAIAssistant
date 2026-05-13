import LandingPage from "./pages/LandingPage";
import StaticPage from "./pages/StaticPage";

function App() {
  const path = window.location.pathname;

  if (path === "/") {
    return <LandingPage />;
  }

  return <StaticPage path={path} />;
}

export default App;
