import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { getCurrentBusinessApi } from "../../api/businesses";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import { toAssetUrl } from "../../utils/helper";

export default function BusinessProfilePage() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBusinessProfile() {
      try {
        setLoading(true);
        setError("");
        const data = await getCurrentBusinessApi();
        setBusiness(data);
      } catch (err) {
        setError(err.message || "Failed to load business profile.");
      } finally {
        setLoading(false);
      }
    }

    loadBusinessProfile();
  }, []);

  const avatarUrl = useMemo(
    () => toAssetUrl(business?.avatar || ""),
    [business]
  );

  return (
    <PageShell
      title="Business Profile"
      subtitle="View your business account details and verification status."
      actions={
        <Link to="/business/profile/edit" className="button">
          Edit Profile
        </Link>
      }
    >
      {loading ? <LoadingSpinner text="Loading business profile..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && !business ? (
        <EmptyState message="Business profile not found." />
      ) : null}

      {!loading && !error && business ? (
        <div className="grid grid--2">
          <div className="card stack">
            <h2 className="section-title" style={{ margin: 0 }}>
              {business.business_name || `Business #${business.id}`}
            </h2>

            <div>
              <strong>Owner</strong>
              <p>{business.owner_name || "Not available"}</p>
            </div>

            <div>
              <strong>Email</strong>
              <p>{business.email || "Not available"}</p>
            </div>

            <div>
              <strong>Phone Number</strong>
              <p>{business.phone_number || "Not available"}</p>
            </div>

            <div>
              <strong>Biography</strong>
              <p>{business.biography || "No description provided."}</p>
            </div>

            <div>
              <strong>Verification</strong>
              <p>
                <StatusBadge status={business.verified ? "verified" : "pending"} />
              </p>
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
                  alt={`${business.business_name || "Business"} avatar`}
                  style={{
                    width: "140px",
                    height: "140px",
                    objectFit: "cover",
                    borderRadius: "16px",
                    border: "1px solid #d1d5db",
                  }}
                />
              ) : (
                <div className="card card--muted">No avatar uploaded yet.</div>
              )}
            </div>

            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Location
              </h2>

              <div>
                <strong>Address</strong>
                <p>{business.postal_address || "Not available"}</p>
              </div>

              <div>
                <strong>Latitude</strong>
                <p>
                  {business.location && typeof business.location.lat === "number"
                    ? business.location.lat
                    : "Unavailable"}
                </p>
              </div>

              <div>
                <strong>Longitude</strong>
                <p>
                  {business.location && typeof business.location.lon === "number"
                    ? business.location.lon
                    : "Unavailable"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}