import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getJobByIdApi, setJobInterestApi } from "../../api/jobs";
import { getUserInterestsApi } from "../../api/users"; 
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isInterested, setIsInterested] = useState(false); 
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestError, setInterestError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadJob() {
      try {
        setLoading(true);
        setError("");
        const data = await getJobByIdApi(jobId);
        setJob(data);

        const interestsData = await getUserInterestsApi(`?limit=100`);
        const interests = interestsData.results || [];
        const match = interests.find(i => i.job?.id === data.id);
        setIsInterested(!!match);

      } catch (err) {
        setError(err.message || "Failed to load job.");
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadJob();
    }
  }, [jobId]);

  const businessName = useMemo(() => {
    if (!job) return "";
    return job.business?.business_name || "Unknown";
  }, [job]);

  const positionName = useMemo(() => {
    if (!job) return "";
    return job.position_type?.name || "Unknown";
  }, [job]);

  const canActOnJob = useMemo(() => {
    if (!job?.status) return false;
    return job.status === "open";
  }, [job]);

  const handleSetInterest = async (interested) => {
    if (!job) return;

    setInterestError("");
    setSuccess("");
    setInterestLoading(true);

    try {
      await setJobInterestApi(job.id, { interested });
      setIsInterested(interested); 
      setSuccess(
        interested
          ? "Interest expressed successfully."
          : "Interest withdrawn successfully."
      );
    } catch (err) {
      setInterestError(err.message || "Failed to update interest.");
    } finally {
      setInterestLoading(false);
    }
  };

  return (
    <PageShell
      title="Job Detail"
      subtitle="Review the job and manage your interest."
      actions={
        <button
          type="button"
          className="button button--secondary"
          onClick={() => navigate("/user/jobs")}
        >
          Back to Jobs
        </button>
      }
    >
      {loading ? <LoadingSpinner text="Loading job..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && !job ? (
        <EmptyState message="Job not found." />
      ) : null}

      {!loading && !error && job ? (
        <div className="grid grid--2">
          <div className="card stack">
            <div className="row row--between">
              <div>
                <h2 className="section-title" style={{ margin: 0 }}>
                  {positionName}
                </h2>
                <p className="helper-text">{businessName}</p>
              </div>

              <StatusBadge status={job.status} />
            </div>

            <div>
              <strong>Work Window</strong>
              <p>
                Start:{" "}
                {job.start_time
                  ? new Date(job.start_time).toLocaleString()
                  : "Unknown"}
              </p>
              <p>
                End:{" "}
                {job.end_time
                  ? new Date(job.end_time).toLocaleString()
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

            <div>
              <strong>Note</strong>
              <p>{job.note || "No note provided."}</p>
            </div>
          </div>

          <div className="stack">
            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Your Status
              </h2>

              <div>
                <strong>Your Interest</strong>
                <p>{isInterested ? "Interested" : "Not interested"}</p>
              </div>

              {!canActOnJob ? (
                <div className="card card--muted">
                  This job is currently not open, so interest cannot be changed.
                </div>
              ) : null}

              <ErrorAlert message={interestError} />
              {success ? <div className="card card--muted">{success}</div> : null}

              <div className="row">
                {!isInterested ? (
                  <button
                    type="button"
                    className="button"
                    disabled={!canActOnJob || interestLoading}
                    onClick={() => handleSetInterest(true)}
                  >
                    {interestLoading ? "Saving..." : "Express Interest"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={!canActOnJob || interestLoading}
                    onClick={() => handleSetInterest(false)}
                  >
                    {interestLoading ? "Saving..." : "Withdraw Interest"}
                  </button>
                )}
              </div>
            </div>

            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Next Steps
              </h2>

              <p>
                If mutual interest is reached, negotiation may become available
                depending on overall system state and workflow rules.
              </p>

              <div className="row">
                <Link to="/user/interests" className="button button--secondary">
                  View My Interests
                </Link>
                <Link to="/user/invitations" className="button button--secondary">
                  View Invitations
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
