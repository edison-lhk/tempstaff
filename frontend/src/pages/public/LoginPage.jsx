import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { loginApi } from "../../api/auth";
import useAuth from "../../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const getRedirectPathByRole = (role) => {
    if (role === "regular") return "/user";
    if (role === "business") return "/business";
    if (role === "admin") return "/admin";
    return "/";
  };

  const decodeRoleFromToken = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role ?? null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await loginApi(form);

      // Change this if your backend returns a different key
      const token = response.token;

      if (!token) {
        throw new Error("Login succeeded but no token was returned.");
      }

      login(token);

      const role = decodeRoleFromToken(token);
      const fallbackPath = getRedirectPathByRole(role);
      const redirectTo = location.state?.from?.pathname || fallbackPath;

      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell title="Log In" subtitle="Access your TempStaff account.">
      <div className="card form-card">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {error ? <div className="error-alert">{error}</div> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>

          <div className="row row--between">
            <Link to="/reset/request" className="link-button">
              Forgot password?
            </Link>
            <Link to="/register/user" className="link-button">
              Create account
            </Link>
          </div>
        </form>
      </div>
    </PageShell>
  );
}