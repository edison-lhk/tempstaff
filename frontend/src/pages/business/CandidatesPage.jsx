import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getJobByIdApi, getJobCandidatesApi, setCandidateInterestApi } from "../../api/jobs";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination from "../../components/common/Pagination";

export default function CandidatesPage() {
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(limit));

        const [jobData, candidatesData] = await Promise.all([
          getJobByIdApi(jobId),
          getJobCandidatesApi(jobId, `?${query.toString()}`),
        ]);

        setJob(jobData);

        const results = Array.isArray(candidatesData)
          ? candidatesData
          : candidatesData.results || [];
        setCandidates(results);

        if (!Array.isArray(candidatesData)) {
          if (candidatesData.totalPages != null) {
            setTotalPages(candidatesData.totalPages);
          } else if (candidatesData.count != null) {
            setTotalPages(Math.max(1, Math.ceil(candidatesData.count / limit)));
          } else {
            setTotalPages(1);
          }
        } else {
          setTotalPages(1);
        }
      } catch (err) {
        setError(err.message || "Failed to load candidates.");
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      loadData();
    }
  }, [jobId, page, limit]);

  const positionName = useMemo(() => {
    if (!job) return "";
    return (
      job.position_type?.name ||
      job.position_type?.title ||
      job.position_type_name ||
      `Position #${job.position_type_id ?? job.positionTypeId ?? "Unknown"}`
    );
  }, [job]);

  const handleExpressInterest = async (candidateId) => {
    try {
      setActionError("");
      setActionLoadingId(candidateId);

      await setCandidateInterestApi(jobId, candidateId, { interested: true });

      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, invited: true }
            : candidate
        )
      );
    } catch (err) {
      setActionError(err.message || "Failed to express interest in candidate.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWithdrawInterest = async (candidateId) => {
    try {
      setActionError("");
      setActionLoadingId(candidateId);
  
      await setCandidateInterestApi(jobId, candidateId, { interested: false });
  
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === candidateId
            ? { ...candidate, invited: false }
            : candidate
        )
      );
    } catch (err) {
      setActionError(err.message || "Failed to withdraw interest.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <PageShell
      title="Candidates"
      subtitle={`Discover eligible candidates for ${positionName || "this job"}.`}
      actions={
        <Link to={`/business/jobs/${jobId}`} className="button button--secondary">
          Back to Job
        </Link>
      }
    >
      {loading ? <LoadingSpinner text="Loading candidates..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />

      {!loading && !error && candidates.length === 0 ? (
        <EmptyState message="No candidates found for this job." />
      ) : null}

      {!loading && !error && candidates.length > 0 ? (
        <>
          <div className="stack">
            {candidates.map((candidate) => {
              const fullName =
                `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() ||
                `Candidate #${candidate.id}`;

              const invited = candidate.invited ?? false;

              return (
                <div key={candidate.id} className="card stack">
                  <div className="row row--between">
                    <div>
                      <strong>{fullName}</strong>
                    </div>

                    <StatusBadge status={invited ? "active" : "pending"} />
                  </div>

                  <div className="row">
                    <Link
                      to={`/business/jobs/${jobId}/candidates/${candidate.id}`}
                      className="button button--secondary"
                    >
                      View Details
                    </Link>

                    {!invited ? (
                      <button
                        className="button"
                        type="button"
                        disabled={actionLoadingId === candidate.id}
                        onClick={() => handleExpressInterest(candidate.id)}
                      >
                        {actionLoadingId === candidate.id ? "Saving..." : "Express Interest"}
                      </button>
                    ) : (
                      <button
                        className="button button--danger"
                        type="button"
                        disabled={actionLoadingId === candidate.id}
                        onClick={() => handleWithdrawInterest(candidate.id)}
                      >
                        {actionLoadingId === candidate.id ? "Saving..." : "Withdraw Interest"}
                      </button>
                    )}
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
