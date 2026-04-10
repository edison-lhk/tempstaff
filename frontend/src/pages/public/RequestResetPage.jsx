import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { requestResetApi } from "../../api/auth";

export default function RequestResetPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const resetResponse = await requestResetApi({ email: email.trim() });

      const resetToken = resetResponse.resetToken;

      if (!resetToken) {
        throw new Error("Activation token was not returned by the server.");
      }

      setSuccess(
        "If the account exists, a reset request has been created. Use your valid reset token on the next page."
      );

      navigate(`/reset/${resetToken}`, {
        state: {
          email: email.trim()
        },
      });
    } catch (err) {
      setError(err.message || "Failed to request password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Request Password Reset"
      subtitle="Enter your email to start the password reset process."
    >
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {error ? <div className="error-alert">{error}</div> : null}
          {success ? <div className="card card--muted">{success}</div> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Request Reset"}
          </button>

          <div className="row row--between">
            <Link to="/login" className="link-button">
              Back to login
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