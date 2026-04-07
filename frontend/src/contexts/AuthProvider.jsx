import { useMemo, useState } from "react";
import AuthContext from "./AuthContext";

function decodeJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const user = useMemo(() => {
    if (!token) return null;

    const payload = decodeJwt(token);
    if (!payload) return null;

    return payload ? { id: payload.id, role: payload.role } : null;
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      role: user?.role ?? null,
      isAuthenticated: !!token,
      login,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}