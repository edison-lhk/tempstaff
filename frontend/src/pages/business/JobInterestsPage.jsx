import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getJobByIdApi, getJobInterestsApi } from "../../api/jobs";
import {
  getMyNegotiationsApi,
  updateMyNegotiationDecisionApi,
  createNegotiationApi,
} from "../../api/negotiations";
import NegotiationPanel from "../../components/negotiations/NegotiationPanel";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination from "../../components/common/Pagination";

export default function JobInterestsPage() {
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [interests, setInterests] = useState([]);
  const [negotiation, setNegotiation] = useState([]);

  const [loading, setLoading] = useState(true);
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);

  const [actionLoadingId, setActionLoadingId] = useState(null); 

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [jobData, interestsData, negotiationsData] = await Promise.all([
          getJobByIdApi(jobId),
          getJobInterestsApi(jobId, `?page=${page}&limit=${limit}`),
          getMyNegotiationsApi().catch(() => null),
        ]);

        setJob(jobData);

        const results = Array.isArray(interestsData)
          ? interestsData
          : interestsData.results || [];
        setInterests(results);

        if (!Array.isArray(interestsData)) {
          if (interestsData.totalPages != null) {
            setTotalPages(interestsData.totalPages);
          } else if (interestsData.count != null) {
            setTotalPages(Math.max(1, Math.ceil(interestsData.count / limit)));
          } else {
            setTotalPages(1);
          }
        } else {
          setTotalPages(1);
        }

        setNegotiation(negotiationsData || null);
      } catch (err) {
        if (err.message === "No active negotiation found") {
          setNegotiation(null);
        } else {
          setError(err.message || "Failed to load job interests.");
        }
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

  const handleBusinessDecision = async (negotiation, decision) => {
    try {
      setDecisionLoadingId(negotiation.id);
      setActionError("");
      setSuccess("");

      const updated = await updateMyNegotiationDecisionApi({
        negotiation_id: negotiation.id,
        decision,
      });

      if (updated.status === "success" || updated.status === "failed") {
        setNegotiation(null);
        // const interestsData = await getJobInterestsApi(jobId, `?page=${page}&limit=${limit}`);
        const [interestsData, jobData] = await Promise.all([
            getJobInterestsApi(jobId, `?page=${page}&limit=${limit}`),
            getJobByIdApi(jobId),
        ]);
        const results = Array.isArray(interestsData) ? interestsData : interestsData.results || [];
        setInterests(results);
        setJob(jobData);
      } else {
        setNegotiation(prev => ({
          ...prev,
          status: updated.status,
          decisions: updated.decisions,
        }));
      }

      setSuccess(
        decision === "accept"
          ? "Negotiation accepted successfully."
          : "Negotiation rejected successfully."
      );
    } catch (err) {
      setActionError(err.message || "Failed to update negotiation decision.");
    } finally {
      setDecisionLoadingId(null);
    }
  };

  const handleStartNegotiation = async (interest) => {
    try {
      setActionLoadingId(interest.interest_id);
      setActionError("");
      setSuccess("");
  
      const created = await createNegotiationApi({ interest_id: interest.interest_id });
      setNegotiation(created);
      setSuccess("Negotiation started successfully.");
    } catch (err) {
      setActionError(err.message || "Failed to start negotiation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <PageShell
      title="Job Interests"
      subtitle={`Track interest states for ${positionName || "this job"}.`}
      actions={
        <Link to={`/business/jobs/${jobId}`} className="button button--secondary">
          Back to Job
        </Link>
      }
    >
      {loading ? <LoadingSpinner text="Loading interests..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />
      {success ? <div className="card card--muted">{success}</div> : null}

      {!loading && !error && interests.length === 0 ? (
        <EmptyState message="No interests found for this job." />
      ) : null}

      {!loading && !error && interests.length > 0 ? (
        <>
          <div className="stack">
            {interests.map((interest) => {
              const user = interest.user || {};
              const fullName =
                `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
                `User #${user.id ?? "Unknown"}`;

              const mutualInterest = interest.mutual === true;

              const linkedNegotiation = negotiation && negotiation.job?.id === parseInt(jobId) 
                && negotiation.user?.id === interest.user?.id ? negotiation : null;

              return (
                <div key={interest.interest_id} className="card stack">
                  <div className="row row--between">
                    <div>
                      <strong>Name</strong>
                      <p>{fullName}</p>
                    </div>

                    <div>
                      <strong>Mutual Interest</strong>
                      <p>
                        {interest.mutual === true
                          ? "Yes"
                          : interest.mutual === false
                          ? "No"
                          : "Pending"}
                      </p>
                    </div>

                    <StatusBadge status={mutualInterest ? "success" : "pending"} />
                  </div>

                  {linkedNegotiation ? (
                    <NegotiationPanel
                      negotiation={linkedNegotiation}
                      title="Candidate Negotiation"
                      role="business"
                      actionLoading={decisionLoadingId === linkedNegotiation.id}
                      onAccept={() => handleBusinessDecision(linkedNegotiation, "accept")}
                      onReject={() => handleBusinessDecision(linkedNegotiation, "decline")}
                    />
                  ) : null}

                  <div className="row">
                    <Link
                      to={`/business/jobs/${jobId}/candidates/${interest.user.id}`}
                      className="button button--secondary"
                    >
                      View Candidate
                    </Link>

                    <button
                      className="button"
                      type="button"
                      disabled={
                        !mutualInterest ||
                        !!linkedNegotiation ||
                        actionLoadingId === interest.interest_id ||
                        job?.status !== "open"
                      }
                      onClick={() => handleStartNegotiation(interest)}
                    >
                      {actionLoadingId === interest.interest_id
                        ? "Starting..."
                        : linkedNegotiation
                        ? "Negotiation Exists"
                        : "Start Negotiation"}
                    </button>
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
