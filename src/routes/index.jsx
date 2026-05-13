import {
  createBrowserRouter,
} from "react-router-dom";

import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProtectedRoute from "./ProtectedRoute";
import AdminPage from "../pages/AdminPage";
import StaffPage from "../pages/StaffPage";
import RegisterPage from "../pages/RegisterPage";
export const router =
  createBrowserRouter([
    {
      path: "/",
      element: <LandingPage />,
    },
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
  path: "/dashboard",
  element: (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
},
{
  path: "/admin",
  element: (
    <ProtectedRoute
      allowedRoles={["Admin"]}
    >
      <AdminPage />
    </ProtectedRoute>
  ),
},

{
  path: "/staff",
  element: (
    <ProtectedRoute
      allowedRoles={["Staff"]}
    >
      <StaffPage />
    </ProtectedRoute>
  ),
},
{
  path: "/register",
  element: <RegisterPage />,
},
  ]);
