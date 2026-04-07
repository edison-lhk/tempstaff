import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getBusinessJobsApi } from "../../api/businesses";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";

export default function BusinessJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(limit));

        const data = await getBusinessJobsApi(`?${query.toString()}`);
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
        setError(err.message || "Failed to load business jobs.");
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [page, limit]);

  return (
    <PageShell
      title="My Jobs"
      subtitle="View and manage jobs created by your business."
      actions={
        <Link to="/business/jobs/new" className="button">
          Create Job
        </Link>
      }
    >
      {loading ? <LoadingSpinner text="Loading jobs..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && jobs.length === 0 ? (
        <EmptyState message="No jobs found." />
      ) : null}

      {!loading && !error && jobs.length > 0 ? (
        <>
          <div className="stack">
            {jobs.map((job) => {
              const positionName = job.position_type?.name || "Unknown";

              return (
                <div key={job.id} className="card stack">
                  <div className="row row--between">
                    <div>
                      <strong>{positionName}</strong>
                      <p className="helper-text">
                        {job.start_time
                          ? new Date(job.start_time).toLocaleString()
                          : "Unknown start"}
                      </p>
                    </div>

                    <StatusBadge status={job.status} />
                  </div>

                  <div className="grid grid--3">
                    <div>
                      <strong>End Time</strong>
                      <p>
                        {job.end_time
                          ? new Date(job.end_time).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>

                    <div>
                      <strong>Salary Range</strong>
                      <p>
                        {job.salary_min != null || job.salary_max != null
                          ? `${job.salary_min ?? "?"} - ${job.salary_max ?? "?"}`
                          : "Not available"}
                      </p>
                    </div>

                    <div>
                      <strong>Filled Worker</strong>
                      <p>
                        {job.worker
                          ? `${job.worker.first_name || ""} ${job.worker.last_name || ""}`.trim() ||
                            "Assigned"
                          : "None"}
                      </p>
                    </div>
                  </div>

                  <div className="row">
                    <Link
                      to={`/business/jobs/${job.id}`}
                      className="button button--secondary"
                    >
                      View Details
                    </Link>

                    <Link
                      to={`/business/jobs/${job.id}/candidates`}
                      className="button button--secondary"
                    >
                      View Candidates
                    </Link>

                    <Link
                      to={`/business/jobs/${job.id}/interests`}
                      className="button button--secondary"
                    >
                      View Interests
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
