import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getCurrentUserApi } from "../../api/users";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { toAssetUrl, getFileNameFromPath } from "../../utils/helper";

export default function UserProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        setError("");

        const data = await getCurrentUserApi();
        setUser(data);
      } catch (err) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const avatarUrl = useMemo(
    () => toAssetUrl(user?.avatar || ""),
    [user]
  );

  const resumeUrl = useMemo(
    () => toAssetUrl(user?.resume || ""),
    [user]
  );

  const resumeFileName = getFileNameFromPath(user?.resume || "");

  return (
    <PageShell
      title="My Profile"
      subtitle="View your personal information."
      actions={
        <Link to="/user/profile/edit" className="button">
          Edit Profile
        </Link>
      }
    >
      {loading ? <LoadingSpinner text="Loading profile..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && user ? (
        <div className="grid grid--2">
          <div className="card stack">
            <h2 className="section-title" style={{ margin: 0 }}>
              Personal Information
            </h2>

            <div>
              <strong>First Name</strong>
              <p>{user.first_name}</p>
            </div>

            <div>
              <strong>Last Name</strong>
              <p>{user.last_name}</p>
            </div>

            <div>
              <strong>Email</strong>
              <p>{user.email}</p>
            </div>

            <div>
              <strong>Phone</strong>
              <p>{user.phone_number || "Not provided"}</p>
            </div>

            <div>
              <strong>Address</strong>
              <p>{user.postal_address || "Not provided"}</p>
            </div>

            <div>
              <strong>Birthday</strong>
              <p>{user.birthday || "Not provided"}</p>
            </div>
          </div>

          <div className="stack">
            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Avatar
              </h2>

              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={{
                    width: "140px",
                    height: "140px",
                    objectFit: "cover",
                    borderRadius: "16px",
                    border: "1px solid #d1d5db",
                  }}
                />
              ) : (
                <div className="card card--muted">
                  No avatar uploaded yet.
                </div>
              )}
            </div>

            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Resume
              </h2>

              {resumeUrl ? (
                <div className="card card--muted">
                  <div className="row row--between">
                    <span>{resumeFileName}</span>

                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="button button--secondary"
                    >
                      View
                    </a>
                  </div>
                </div>
              ) : (
                <div className="card card--muted">
                  No resume uploaded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}