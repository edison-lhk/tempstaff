import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";

export default function UserDashboardPage() {
  return (
    <PageShell
      title="Worker Dashboard"
      subtitle="Quick access to your profile, qualifications, jobs, and activity."
    >
      <div className="grid grid--2">
        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>
            Profile
          </h2>
          <p>Review and update your personal details, resume, and avatar.</p>
          <div className="row">
            <Link to="/user/profile" className="button">
              View Profile
            </Link>
            <Link to="/user/profile/edit" className="button button--secondary">
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>
            Qualifications
          </h2>
          <p>Track requests, view statuses, and submit new qualification documents.</p>
          <div className="row">
            <Link to="/user/qualifications" className="button">
              View Qualifications
            </Link>
          </div>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>
            Jobs
          </h2>
          <p>Browse available jobs and manage the positions you are interested in.</p>
          <div className="row">
            <Link to="/user/jobs" className="button">
              Browse Jobs
            </Link>
            <Link to="/user/interests" className="button button--secondary">
              My Interests
            </Link>
          </div>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>
            Activity
          </h2>
          <p>Check invitations, negotiations, and current commitments.</p>
          <div className="row">
            <Link to="/user/invitations" className="button">
              Invitations
            </Link>
            <Link to="/user/commitments" className="button button--secondary">
              Commitments
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}