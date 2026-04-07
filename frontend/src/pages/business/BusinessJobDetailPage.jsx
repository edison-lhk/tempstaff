import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { deleteBusinessJobApi } from "../../api/businesses";
import { getJobByIdApi } from "../../api/jobs";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function BusinessJobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    async function loadJob() {
      try {
        setLoading(true);
        setError("");
        const data = await getJobByIdApi(jobId);
        setJob(data);
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

  const positionName = useMemo(() => {
    if (!job) return "";
    return (
      job.position_type?.name ||
      job.position_type?.title ||
      job.position_type_name ||
      `Position #${job.position_type_id ?? "Unknown"}`
    );
  }, [job]);

  const canEdit = useMemo(() => {
    if (!job?.status) return false;
    return job.status === "open";
  }, [job]);

  const canDelete = useMemo(() => {
    if (!job?.status) return false;
    return job.status === "open";
  }, [job]);

  const handleDelete = async () => {
    if (!job) return;

    try {
      setDeleting(true);
      setActionError("");
      await deleteBusinessJobApi(job.id);
      navigate("/business/jobs");
    } catch (err) {
      setActionError(err.message || "Failed to delete job.");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <PageShell
      title="Job Detail"
      subtitle="Review this job posting and its current status."
      actions={
        <div className="row">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => navigate("/business/jobs")}
          >
            Back
          </button>

          {canEdit ? (
            <Link to={`/business/jobs/${jobId}/edit`} className="button">
              Edit Job
            </Link>
          ) : null}
        </div>
      }
    >
      {loading ? <LoadingSpinner text="Loading job..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />

      {!loading && !error && !job ? <EmptyState message="Job not found." /> : null}

      {!loading && !error && job ? (
        <div className="grid grid--2">
          <div className="card stack">
            <div className="row row--between">
              <h2 className="section-title" style={{ margin: 0 }}>
                {positionName}
              </h2>
              <StatusBadge status={job.status} />
            </div>

            <div>
              <strong>Start Time</strong>
              <p>{job.start_time ? new Date(job.start_time).toLocaleString() : "Unknown"}</p>
            </div>

            <div>
              <strong>End Time</strong>
              <p>{job.end_time ? new Date(job.end_time).toLocaleString() : "Unknown"}</p>
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
              <strong>Note</strong>
              <p>{job.note || "No additional note."}</p>
            </div>
          </div>

          <div className="card stack">
            <div>
              <strong>Assigned Worker</strong>
              <p>
                {job.worker
                  ? `${job.worker.first_name || ""} ${job.worker.last_name || ""}`.trim()
                  : "No worker assigned"}
              </p>
            </div>

            <div>
              <strong>Last Updated</strong>
              <p>{job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "Unknown"}</p>
            </div>

            {!canEdit ? (
              <div className="card card--muted">
                This job is not editable because it is no longer open.
              </div>
            ) : null}

            <div className="row">
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

            <div className="row">
              <button
                type="button"
                className="button button--danger"
                onClick={() => setConfirmOpen(true)}
                disabled={!canDelete || deleting}
              >
                {deleting ? "Deleting..." : "Delete Job"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete job"
        message="Are you sure you want to delete this job? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </PageShell>
  );
}
