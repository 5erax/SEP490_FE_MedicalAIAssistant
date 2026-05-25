import { AppProviders } from "./app/AppProviders.jsx";
import { AppRouter } from "./app/AppRouter.jsx";
import { useSessionRefresh } from "./app/useSessionRefresh";

function App() {
  useSessionRefresh();

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
