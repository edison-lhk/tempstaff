import useAuth from "../../hooks/useAuth";

export default function RoleGuard({ allowedRoles = [], children, fallback = null }) {
  const { role } = useAuth();

  if (!allowedRoles.includes(role)) {
    return fallback;
  }

  return children;
}