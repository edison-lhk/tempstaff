import { Link, NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function NavBar() {
  const { isAuthenticated, role, logout } = useAuth();

  const navClass = ({ isActive }) =>
    isActive ? "nav-link nav-link--active" : "nav-link";

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <Link to="/" className="navbar__brand">
          TempStaff
        </Link>

        {!isAuthenticated && (
          <div className="navbar__links">
            <NavLink to="/businesses" className={navClass}>
              Businesses
            </NavLink>
            <NavLink to="/login" className={navClass}>
              Login
            </NavLink>
            <NavLink to="/register/user" className={navClass}>
              Register as Worker
            </NavLink>
            <NavLink to="/register/business" className={navClass}>
              Register as Business
            </NavLink>
          </div>
        )}

        {role === "regular" && (
          <div className="navbar__links">
            <NavLink to="/user" className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/user/jobs" className={navClass}>
              Jobs
            </NavLink>
            <NavLink to="/user/qualifications" className={navClass}>
              Qualifications
            </NavLink>
            <NavLink to="/user/invitations" className={navClass}>
              Invitations
            </NavLink>
            <NavLink to="/user/interests" className={navClass}>
              Interests
            </NavLink>
            <NavLink to="/user/commitments" className={navClass}>
              Commitments
            </NavLink>
            <NavLink to="/user/profile" className={navClass}>
              Profile
            </NavLink>
          </div>
        )}

        {role === "business" && (
          <div className="navbar__links">
            <NavLink to="/business" className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/business/jobs" className={navClass}>
              My Jobs
            </NavLink>
            <NavLink to="/business/jobs/new" className={navClass}>
              Create Job
            </NavLink>
            <NavLink to="/business/profile" className={navClass}>
              Profile
            </NavLink>
          </div>
        )}

        {role === "admin" && (
          <div className="navbar__links">
            <NavLink to="/admin" className={navClass}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={navClass}>
              Users
            </NavLink>
            <NavLink to="/admin/businesses" className={navClass}>
              Businesses
            </NavLink>
            <NavLink to="/admin/position-types" className={navClass}>
              Position Types
            </NavLink>
            <NavLink to="/admin/qualifications" className={navClass}>
              Qualifications
            </NavLink>
            <NavLink to="/admin/system" className={navClass}>
              System
            </NavLink>
          </div>
        )}
      </div>

      <div className="navbar__right">
        {isAuthenticated ? (
          <button className="button button--secondary" onClick={logout}>
            Logout
          </button>
        ) : null}
      </div>
    </nav>
  );
}