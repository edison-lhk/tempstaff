import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";

export default function AdminDashboardPage() {
  return (
    <PageShell
      title="Admin Dashboard"
      subtitle="Manage platform users, businesses, qualifications, position types, and system settings."
    >
      <div className="grid grid--2">
        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Users</h2>
          <p>Review user accounts and suspend or unsuspend them.</p>
          <Link to="/admin/users" className="button">Manage Users</Link>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Businesses</h2>
          <p>Review business accounts and control verification.</p>
          <Link to="/admin/businesses" className="button">Manage Businesses</Link>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Position Types</h2>
          <p>Create, edit, hide, and delete position types where allowed.</p>
          <Link to="/admin/position-types" className="button">Manage Position Types</Link>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>Qualifications</h2>
          <p>Review qualification requests and update their statuses.</p>
          <Link to="/admin/qualifications" className="button">Review Qualifications</Link>
        </div>

        <div className="card stack">
          <h2 className="section-title" style={{ margin: 0 }}>System Config</h2>
          <p>Update reset cooldown, negotiation window, job start window, and availability timeout.</p>
          <Link to="/admin/system" className="button">Manage System Settings</Link>
        </div>
      </div>
    </PageShell>
  );
}