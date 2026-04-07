import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getBusinessByIdApi } from "../../api/businesses";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import { toAssetUrl } from "../../utils/helper";

export default function BusinessDetailPage() {
  const { businessId } = useParams();

  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBusiness() {
      try {
        setLoading(true);
        setError("");

        const data = await getBusinessByIdApi(businessId);
        setBusiness(data);
      } catch (err) {
        setError(err.message || "Failed to load business profile.");
      } finally {
        setLoading(false);
      }
    }

    if (businessId) {
      loadBusiness();
    }
  }, [businessId]);

  const avatarUrl = useMemo(
      () => toAssetUrl(business?.avatar || ""),
      [business]
  );

  return (
    <PageShell
      title="Business Profile"
      subtitle="Public business information"
      actions={
        <Link to="/businesses" className="button button--secondary">
          Back
        </Link>
      }
    >
      {loading ? <LoadingSpinner text="Loading..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && !business ? (
        <EmptyState message="Business not found." />
      ) : null}

      {!loading && !error && business ? (
        <div className="stack">
          <div className="card">
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  style={{
                    width: "110px",
                    height: "110px",
                    objectFit: "cover",
                    borderRadius: "16px",
                    border: "1px solid #d1d5db",
                  }}
                />
              ) : (
                <div className="card card--muted" style={{ width: "110px", height: "110px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  No Avatar
                </div>
              )}

              <div className="stack" style={{ gap: "0.4rem" }}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  {business.business_name || "Business"}
                </h2>

                <p style={{ margin: 0 }}>
                  {business.biography || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid--2">
            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Contact
              </h2>

              <div>
                <strong>Phone</strong>
                <p>{business.phone_number || "Not available"}</p>
              </div>

              <div>
                <strong>Email</strong>
                <p>{business.email || "Not available"}</p>
              </div>

              <div>
                <strong>Address</strong>
                <p>{business.postal_address || "Not available"}</p>
              </div>
            </div>

            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Location
              </h2>

              <div>
                <strong>Latitude</strong>
                <p>
                  {business.location?.lat ?? "Unavailable"}
                </p>
              </div>

              <div>
                <strong>Longitude</strong>
                <p>
                  {business.location?.lon ?? "Unavailable"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}