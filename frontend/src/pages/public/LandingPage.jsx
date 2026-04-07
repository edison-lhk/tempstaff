import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import useAuth from "../../hooks/useAuth";

export default function LandingPage() {
  const { isAuthenticated, role } = useAuth();

  const dashboardPath =
    role === "regular"
      ? "/user"
      : role === "business"
      ? "/business"
      : role === "admin"
      ? "/admin"
      : "/login";

  return (
    <PageShell>
      <section className="hero">
        <div className="stack">
          <h1 className="hero__title">Temporary staffing, without the chaos</h1>
          <p className="hero__subtitle">
            TempStaff helps workers, businesses, and administrators manage
            qualifications, jobs, interests, invitations, and negotiations in
            one clear workflow.
          </p>

          <div className="row">
            {isAuthenticated ? (
              <Link to={dashboardPath} className="button">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="button">
                  Log In
                </Link>
                <Link to="/register/user" className="button button--secondary">
                  Join as Worker
                </Link>
                <Link
                  to="/register/business"
                  className="button button--secondary"
                >
                  Join as Business
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid--3">
        <div className="card">
          <h2 className="section-title">For workers</h2>
          <p>
            Build a profile, submit qualifications, browse jobs, and track
            invitations and negotiations clearly.
          </p>
        </div>

        <div className="card">
          <h2 className="section-title">For businesses</h2>
          <p>
            Create postings, review candidates, express interest, and fill
            shifts with transparent workflow status.
          </p>
        </div>

        <div className="card">
          <h2 className="section-title">For admins</h2>
          <p>
            Manage users, verify businesses, review qualifications, and control
            system-wide settings.
          </p>
        </div>
      </section>

      <section className="grid grid--2">
        <div className="card">
          <h2 className="section-title">Explore public business profiles</h2>
          <p>
            Public visitors can browse participating businesses before signing
            in.
          </p>
          <Link to="/businesses" className="link-button">
            View businesses
          </Link>
        </div>

        <div className="card">
          <h2 className="section-title">State-first interface</h2>
          <p>
            The platform is designed to make permissions, time-sensitive actions,
            and workflow restrictions obvious at a glance.
          </p>
        </div>
      </section>
    </PageShell>
  );
}