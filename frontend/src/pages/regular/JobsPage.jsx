import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getJobsApi } from "../../api/jobs";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    sort: "start_time",
    order: "asc",
  });

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [filters.sort, filters.order]);

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(limit));

        if (filters.sort) query.set("sort", filters.sort);
        if (filters.order) query.set("order", filters.order);

        const data = await getJobsApi(`?${query.toString()}`);
        const results = Array.isArray(data) ? data : data.results || [];
        setJobs(results);

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
        setError(err.message || "Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [filters, page, limit]);

  return (
    <PageShell
      title="Available Jobs"
      subtitle="Browse jobs you may be eligible for and inspect their current state."
    >
      <div className="card stack">
        <h2 className="section-title" style={{ margin: 0 }}>
          Filter Jobs
        </h2>

        <div className="grid grid--3">
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
              <option value="start_time">Start Time</option>
              <option value="salary_min">Min Salary</option>
              <option value="salary_max">Max Salary</option>
              <option value="updatedAt">Updated Time</option>
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

      {loading ? <LoadingSpinner text="Loading jobs..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && jobs.length === 0 ? (
        <EmptyState message="No jobs found." />
      ) : null}

      {!loading && !error && jobs.length > 0 ? (
        <>
          <div className="stack">
            {jobs.map((job) => {
              const businessName =
                job.business?.business_name ||
                job.business_name ||
                `Business #${job.business_id ?? "Unknown"}`;

              const positionName =
                job.position_type?.name ||
                job.position_type?.title ||
                job.position_type_name ||
                `Position #${job.position_type_id ?? "Unknown"}`;

              return (
                <div key={job.id} className="card stack">
                  <div className="row row--between">
                    <div>
                      <h2 className="section-title" style={{ margin: 0 }}>
                        {positionName}
                      </h2>
                      <p className="helper-text">{businessName}</p>
                    </div>

                    <StatusBadge status={job.status} />
                  </div>

                  <div className="grid grid--3">
                    <div>
                      <strong>Work Window</strong>
                      <p>
                        {job.start_time
                          ? `Start: ${new Date(job.start_time).toLocaleString()}`
                          : "Unknown"}
                      </p>
                      <p>
                        {job.end_time
                          ? `End: ${new Date(job.end_time).toLocaleString()}`
                          : "Unknown"}
                      </p>
                    </div>

                    <div>
                      <strong>Salary Range</strong>
                      <p>
                        {job.salary_min != null || job.salary_max != null
                          ? `$${job.salary_min ?? "?"} - $${job.salary_max ?? "?"}`
                          : "Not available"}
                      </p>
                    </div>

                    <div>
                      <strong>Updated Time</strong>
                      <p>
                        {job.updatedAt? new Date(job.updatedAt).toLocaleString() : "Unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="row">
                    <Link
                      to={`/user/jobs/${job.id}`}
                      className="button button--secondary"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}
    </PageShell>
  );
}