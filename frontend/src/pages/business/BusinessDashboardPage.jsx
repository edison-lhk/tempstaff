import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { getCurrentBusinessApi, getBusinessJobsApi } from "../../api/businesses";
import StatusBadge from "../../components/common/StatusBadge";

export default function BusinessDashboardPage() {
  const [business, setBusiness] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [businessData, jobsData] = await Promise.all([
          getCurrentBusinessApi(),
          getBusinessJobsApi(),
        ]);

        setBusiness(businessData);
        setJobs(Array.isArray(jobsData) ? jobsData : jobsData.results || []);
      } catch (err) {
        setError(err.message || "Failed to load business dashboard.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const counts = {
      total: jobs.length,
      open: 0,
      filled: 0,
      completed: 0,
      expired: 0,
      cancelled: 0,
    };

    for (const job of jobs) {
      const status = job.status;
      if (status === "open") counts.open += 1;
      else if (status === "filled") counts.filled += 1;
      else if (status === "completed") counts.completed += 1;
      else if (status === "expired") counts.expired += 1;
      else if (status === "cancelled" || status === "canceled") {
        counts.cancelled += 1;
      }
    }

    return counts;
  }, [jobs]);

  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0).getTime();
        const bTime = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [jobs]);

  const statusClass = (status) => {
    if (status === "open") return "badge badge--success";
    if (status === "filled" || status === "completed") return "badge badge--info";
    if (status === "expired") return "badge badge--warning";
    if (status === "cancelled" || status === "canceled") return "badge badge--danger";
    return "badge badge--neutral";
  };

  return (
    <PageShell
      title="Business Dashboard"
      subtitle="Monitor your business profile, jobs, and hiring activity."
      actions={
        <div className="row">
          <Link to="/business/jobs/new" className="button">
            Create Job
          </Link>
          <Link to="/business/profile" className="button button--secondary">
            View Profile
          </Link>
        </div>
      }
    >
      {loading ? <div className="card">Loading dashboard...</div> : null}
      {error ? <div className="error-alert">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="grid grid--2">
            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Business Overview
              </h2>

              <div>
                <strong>Name</strong>
                <p>{business?.business_name || "Not available"}</p>
              </div>

              <div>
                <strong>Owner</strong>
                <p>{business?.owner_name || "Not available"}</p>
              </div>

              <div>
                <strong>Verification</strong>
                <p>
                  <StatusBadge status={business.verified ? "verified" : "pending"} />
                </p>
              </div>

              <div>
                <strong>Phone Number</strong>
                <p>{business?.phone_number || "Not available"}</p>
              </div>
            </div>

            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Quick Actions
              </h2>

              <div className="row">
                <Link to="/business/jobs" className="button">
                  View All Jobs
                </Link>
                <Link to="/business/profile/edit" className="button button--secondary">
                  Edit Profile
                </Link>
              </div>

              <div className="row">
                <Link to="/business/jobs/new" className="button button--secondary">
                  Post New Job
                </Link>
              </div>

              {!business?.verified ? (
                <div className="card card--muted">
                  Your business is not verified yet. Some job-related actions may
                  be unavailable until verification is completed.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid--3">
            <div className="card stack">
              <strong>Total Jobs</strong>
              <p>{summary.total}</p>
            </div>

            <div className="card stack">
              <strong>Open Jobs</strong>
              <p>{summary.open}</p>
            </div>

            <div className="card stack">
              <strong>Filled Jobs</strong>
              <p>{summary.filled}</p>
            </div>

            <div className="card stack">
              <strong>Completed Jobs</strong>
              <p>{summary.completed}</p>
            </div>

            <div className="card stack">
              <strong>Expired Jobs</strong>
              <p>{summary.expired}</p>
            </div>

            <div className="card stack">
              <strong>Cancelled Jobs</strong>
              <p>{summary.cancelled}</p>
            </div>
          </div>

          <div className="card stack">
            <div className="row row--between">
              <h2 className="section-title" style={{ margin: 0 }}>
                Recent Jobs
              </h2>
              <Link to="/business/jobs" className="link-button">
                View all jobs
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <div className="empty-state">
                You have not created any jobs yet.
              </div>
            ) : (
              <div className="stack">
                {recentJobs.map((job) => {
                  const positionName =
                    job.position_type?.name ||
                    job.position_type?.title ||
                    job.position_type_name ||
                    `Position #${job.position_type_id ?? "Unknown"}`;

                  return (
                    <div key={job.id} className="card card--muted stack">
                      <div className="row row--between">
                        <div>
                          <strong>{positionName}</strong>
                          <p className="helper-text">
                            {job.start_time
                              ? new Date(job.start_time).toLocaleString()
                              : "Unknown start time"}
                          </p>
                        </div>

                        <span className={statusClass(job.status)}>
                          {job.status || "unknown"}
                        </span>
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
                          Candidates
                        </Link>

                        <Link
                          to={`/business/jobs/${job.id}/interests`}
                          className="button button--secondary"
                        >
                          Interests
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </PageShell>
  );
}