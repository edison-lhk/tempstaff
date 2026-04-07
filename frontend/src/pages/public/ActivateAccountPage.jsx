import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { completeResetApi } from "../../api/auth";
import ErrorAlert from "../../components/common/ErrorAlert";

export default function ActivateAccountPage() {
  const { resetToken } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resetToken) {
      setError("Missing activation token.");
    }
  }, [resetToken]);

  const handleActivate = async () => {
    if (!resetToken) return;

    setError("");
    setLoading(true);

    try {
      await completeResetApi(resetToken, {
        email: email.trim(),
      });

      setActivated(true);

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to activate account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Activate Account"
      subtitle="Confirm your email and activate your account."
      actions={
        <Link to="/login" className="button button--secondary">
          Back to Login
        </Link>
      }
    >
      <div className="card form-card">
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor="activation-email">
              Email
            </label>
            <input
              id="activation-email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter the email you registered with"
            />
          </div>

          <ErrorAlert message={error} />

          {activated ? (
            <div className="card card--muted">
              Account activated successfully. Redirecting to login...
            </div>
          ) : null}

          <button
            type="button"
            className="button"
            onClick={handleActivate}
            disabled={loading || !email.trim() || !resetToken}
          >
            {loading ? "Activating..." : "Activate Account"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}