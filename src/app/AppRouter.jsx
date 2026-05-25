import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes.jsx";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
}
