import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { completeResetApi } from "../../api/auth";

export default function CompleteResetPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (password) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/.test(
      password
    );
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Missing reset token.");
      return;
    }

    if (!validatePassword(form.password)) {
      setError(
        "Password must be 8 to 20 characters and include uppercase, lowercase, a number, and a special character."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await completeResetApi(token, {
        password: form.password,
      });

      setSuccess("Password reset successful. Redirecting to login...");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to complete password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Complete Password Reset"
      subtitle="Set a new password using your valid reset token."
    >
      <div className="card form-card">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={form.password}
              onChange={handleChange}
              required
            />
            <p className="helper-text">
              8 to 20 characters with uppercase, lowercase, number, and special
              character.
            </p>
          </div>

          <div className="field">
            <label className="label" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="input"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {error ? <div className="error-alert">{error}</div> : null}
          {success ? <div className="card card--muted">{success}</div> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Reset Password"}
          </button>

          <div className="row row--between">
            <Link to="/reset/request" className="link-button">
              Request another reset
            </Link>
            <Link to="/login" className="link-button">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </PageShell>
  );
}