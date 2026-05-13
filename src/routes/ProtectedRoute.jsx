import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  allowedRoles,
}) {
  const token =
    localStorage.getItem(
      "accessToken"
    );

  const roles = JSON.parse(
    localStorage.getItem("roles") ||
      "[]"
  );

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (
    allowedRoles &&
    !allowedRoles.some((role) =>
      roles.includes(role)
    )
  ) {
    return <Navigate to="/login" />;
  }

  return children;
}