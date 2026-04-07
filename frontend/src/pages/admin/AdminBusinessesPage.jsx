import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { getBusinessesAdminApi, setBusinessVerifiedApi } from "../../api/admin";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { toAssetUrl } from "../../utils/helper";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [targetBusiness, setTargetBusiness] = useState(null);

  const [filters, setFilters] = useState({
    sort: "",
    order: "asc",
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [keyword, filters.sort, filters.order]);

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(limit));

        if (filters.sort) query.set("sort", filters.sort);
        if (filters.order) query.set("order", filters.order);
        if (keyword.trim()) query.set("keyword", keyword.trim());

        const data = await getBusinessesAdminApi(`?${query.toString()}`);
        const results = Array.isArray(data) ? data : data.results || [];
        setBusinesses(results);

        if (!Array.isArray(data)) {
          if (data.totalPages != null) {
            setTotalPages(data.totalPages);
          } else if (data.count != null) {
            setTotalPages(Math.max(1, Math.ceil(data.count / limit)));
          } else {
            setTotalPages(1);
          }
        } else {
          setTotalPages(1);
        }
      } catch (err) {
        setError(err.message || "Failed to load businesses.");
      } finally {
        setLoading(false);
      }
    }

    loadBusinesses();
  }, [keyword, page, limit, filters]);

  const toggleVerified = async () => {
    if (!targetBusiness) return;

    try {
      setActionError("");
      const updated = await setBusinessVerifiedApi(targetBusiness.id, {
        verified: !targetBusiness.verified,
      });

      setBusinesses((current) =>
        current.map((item) => (item.id === targetBusiness.id ? updated : item))
      );
      setTargetBusiness(null);
    } catch (err) {
      setActionError(err.message || "Failed to update verification status.");
    }
  };

  return (
    <PageShell
      title="Manage Businesses"
      subtitle="Review businesses and update verification."
    >
      <div className="card stack">
        <div className="field">
          <label className="label" htmlFor="business-keyword">
            Search
          </label>
          <input
            id="business-keyword"
            className="input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by business name, email, postal address, phone number or owner name"
          />
        </div>

        <div className="grid grid--2">
          <div className="field">
            <label className="label" htmlFor="job-sort">
              Sort By
            </label>
            <select
              id="job-sort"
              className="select"
              value={filters.sort}
              onChange={(event) =>
                setFilters((current) => ({ ...current, sort: event.target.value }))
              }
            >
              <option value="">Default</option>
              <option value="business_name">Business Name</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="job-order">
              Order
            </label>
            <select
              id="job-order"
              className="select"
              value={filters.order}
              onChange={(event) =>
                setFilters((current) => ({ ...current, order: event.target.value }))
              }
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner text="Loading businesses..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />

      {!loading && !error && businesses.length === 0 ? (
        <EmptyState message="No businesses found." />
      ) : null}

      {!loading && !error && businesses.length > 0 ? (
        <>
          <div className="stack">
            {businesses.map((business) => (
              <div key={business.id} className="card stack">
                <div className="row row--between">
                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {business.avatar ? (
                      <img
                        src={toAssetUrl(business?.avatar || "")}
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

                    <div>
                      <strong>{business.business_name || `Business #${business.id}`}</strong>
                      <p className="helper-text">{business.email || "No email"}</p>
                    </div>
                  </div>

                  <StatusBadge status={business.verified ? "verified" : "pending"} />
                </div>

                <div className="grid grid--2">
                  <div>
                    <strong>Biography</strong>
                    <p>{business.biography || "Not available"}</p>
                  </div>
                  <div>
                    <strong>Phone</strong>
                    <p>{business.phone_number || "Not available"}</p>
                  </div>
                </div>

                <div className="grid grid--2">
                  <div>
                    <strong>Owner</strong>
                    <p>{business.owner_name || "Not available"}</p>
                  </div>
                  <div>
                    <strong>Address</strong>
                    <p>{business.postal_address || "Not available"}</p>
                  </div>
                </div>

                <div className="row">
                  <button
                    className={business.verified ? "button button--secondary" : "button"}
                    type="button"
                    onClick={() => setTargetBusiness(business)}
                  >
                    {business.verified ? "Unverify" : "Verify"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}

      <ConfirmDialog
        open={!!targetBusiness}
        title={targetBusiness?.verified ? "Unverify business" : "Verify business"}
        message={`Are you sure you want to ${targetBusiness?.verified ? "unverify" : "verify"} ${targetBusiness?.business_name || "this business"}?`}
        confirmText={targetBusiness?.verified ? "Unverify" : "Verify"}
        cancelText="Cancel"
        isDanger={false}
        onConfirm={toggleVerified}
        onCancel={() => setTargetBusiness(null)}
      />
    </PageShell>
  );
}