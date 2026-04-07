import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getBusinessesApi } from "../../api/businesses";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    sort: "",
    order: "asc",
  });

  const [page, setPage] = useState(1);
  const limit = 10;
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
        if (keyword.trim()) {
          query.set("keyword", keyword.trim());
        }

        const data = await getBusinessesApi(`?${query.toString()}`);
        const results = Array.isArray(data) ? data : data.results || [];
        setBusinesses(results);

        if (!Array.isArray(data)) {
          if (typeof data.totalPages === "number" && data.totalPages > 0) {
            setTotalPages(data.totalPages);
          } else if (typeof data.count === "number") {
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
  }, [filters, page, keyword]);

  return (
    <PageShell
      title="Businesses"
      subtitle="Browse public business profiles on the platform."
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
            placeholder="Search by business name, postal address or phone number"
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

      {!loading && !error && businesses.length === 0 ? (
        <EmptyState message="No businesses found." />
      ) : null}

      {!loading && !error && businesses.length > 0 ? (
        <>
          <div className="grid grid--2">
            {businesses.map((business) => (
              <article className="card stack" key={business.id}>
                <h2 className="section-title" style={{ margin: 0 }}>
                  {business.business_name || `Business #${business.id}`}
                </h2>

                <div className="stack">
                  <div>
                    <strong>Address</strong>
                    <p>{business.postal_address || "Not available"}</p>
                  </div>
                </div>

                <div className="stack">
                  <div>
                    <strong>Phone</strong>
                    <p>{business.phone_number || "Not available"}</p>
                  </div>
                </div>

                <div>
                  <Link
                    to={`/businesses/${business.id}`}
                    className="button button--secondary"
                  >
                    View Profile
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      ) : null}
    </PageShell>
  );
}