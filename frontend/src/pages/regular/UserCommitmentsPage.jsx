import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getUserJobsApi } from "../../api/users";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

export default function UserCommitmentsPage() {
  const [jobs, setJobs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const data = await getUserJobsApi();
        setJobs(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        setError(err.message || "Failed to load commitments.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const currentCommitments = useMemo(() => {
    return jobs.filter((job) => job.status === "filled");
  }, [jobs]);

  const pastCommitments = useMemo(() => {
    return jobs.filter((job) =>
      ["completed", "cancelled", "canceled", "expired"].includes(job.status)
    );
  }, [jobs]);

  const renderJobCard = (job) => {
    const positionName =
      job.position_type?.name ||
      job.position_type?.title ||
      job.position_type_name ||
      `Position #${job.position_type_id ?? job.positionTypeId ?? "Unknown"}`;

    const businessName =
      job.business?.business_name ||
      job.business_name ||
      `Business #${job.businessId ?? job.business_id ?? "Unknown"}`;

    return (
      <div key={job.id} className="card stack">
        <div className="row row--between">
          <div>
            <strong>{positionName}</strong>
            <p className="helper-text">{businessName}</p>
          </div>

          <StatusBadge status={job.status} />
        </div>

        <div className="grid grid--2">
          <div>
            <strong>Start Time</strong>
            <p>
              {job.start_time
                ? new Date(job.start_time).toLocaleString()
                : "Unknown"}
            </p>
          </div>

          <div>
            <strong>End Time</strong>
            <p>
              {job.end_time
                ? new Date(job.end_time).toLocaleString()
                : "Unknown"}
            </p>
          </div>
        </div>

        <div>
          <strong>Salary Range</strong>
          <p>
            {job.salary_min != null || job.salary_max != null
              ? `${job.salary_min ?? "?"} - ${job.salary_max ?? "?"}`
              : "Not available"}
          </p>
        </div>

        <div className="row">
          <Link to={`/user/jobs/${job.id}`} className="button button--secondary">
            View Job
          </Link>
        </div>
      </div>
    );
  };

  return (
    <PageShell
      title="Work Commitments"
      subtitle="Review your current commitments and past job history."
    >
      {loading ? <LoadingSpinner text="Loading commitments..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error ? (
        <>
          <div className="card stack">
            <h2 className="section-title" style={{ margin: 0 }}>
              Current Commitments
            </h2>

            {currentCommitments.length === 0 ? (
              <EmptyState message="You have no current commitments." />
            ) : (
              <div className="stack">{currentCommitments.map(renderJobCard)}</div>
            )}
          </div>

          <div className="card stack">
            <h2 className="section-title" style={{ margin: 0 }}>
              Past Jobs
            </h2>

            {pastCommitments.length === 0 ? (
              <EmptyState message="You have no past jobs yet." />
            ) : (
              <div className="stack">{pastCommitments.map(renderJobCard)}</div>
            )}
          </div>
        </>
      ) : null}
    </PageShell>
  );
}
