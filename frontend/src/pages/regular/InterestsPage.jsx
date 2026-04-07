import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getUserInterestsApi } from "../../api/users";
import {
  createNegotiationApi,
  getMyNegotiationsApi,
  updateMyNegotiationDecisionApi,
} from "../../api/negotiations";
import NegotiationPanel from "../../components/negotiations/NegotiationPanel";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination from "../../components/common/Pagination";

export default function InterestsPage() {
  const [interests, setInterests] = useState([]);
  const [negotiation, setNegotiation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

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

        const [interestsData, negotiationData] = await Promise.all([
          getUserInterestsApi(`?page=${page}&limit=${limit}`),
          getMyNegotiationsApi().catch(() => null),
        ]);

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

        setNegotiation(negotiationData || null);
      } catch (err) {
        if (err.message === "No active negotiation found") {
          setNegotiation(null);
        } else {
          setError(err.message || "Failed to load interests.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [page, limit]);

  const handleStartNegotiation = async (interest) => {
    try {
      setActionLoadingId(interest.interest_id);
      setActionError("");
      setSuccess("");

      const payload = {
        interest_id: interest.interest_id,
      };

      const created = await createNegotiationApi(payload);

      setNegotiation(created);
      setSuccess("Negotiation started successfully.");
    } catch (err) {
      setActionError(err.message || "Failed to start negotiation.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNegotiationDecision = async (decision) => {
    if (!negotiation) return;

    try {
      setDecisionLoading(true);
      setActionError("");
      setSuccess("");

      const updated = await updateMyNegotiationDecisionApi({
        negotiation_id: negotiation.id,
        decision,
      });

      if (updated.status === "success" || updated.status === "failed") {
        setNegotiation(null);
        const interestsData = await getUserInterestsApi(`?page=${page}&limit=${limit}`);
        const results = Array.isArray(interestsData) ? interestsData : interestsData.results || [];
        setInterests(results);
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
      setDecisionLoading(false);
    }
  };

  return (
    <PageShell
      title="My Interests"
      subtitle="Track jobs you expressed interest in and see whether mutual interest has been reached."
    >
      {negotiation ? (
        <NegotiationPanel
          negotiation={negotiation}
          title="Active Negotiation"
          role="candidate" 
          actionLoading={decisionLoading}
          onAccept={() => handleNegotiationDecision("accept")}
          onReject={() => handleNegotiationDecision("decline")}
        />
      ) : null}

      {loading ? <LoadingSpinner text="Loading interests..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />
      {success ? <div className="card card--muted">{success}</div> : null}

      {!loading && !error && interests.length === 0 ? (
        <EmptyState message="You have not expressed interest in any jobs yet." />
      ) : null}

      {!loading && !error && interests.length > 0 ? (
        <>
          <div className="stack">
            {interests.map((interest) => {
              const job = interest.job || {};
              const positionName = job.position_type?.name || "Unknown";
              const businessName = job.business?.business_name || "Unknown";
              const mutualInterest = interest.mutual;

              // const linkedNegotiation = negotiation ? (negotiation.id === interest.id ? negotiation: null) : null
              const linkedNegotiation = negotiation && negotiation.job?.id === job.id ? negotiation : null;


              return (
                <div key={interest.interest_id} className="card stack">
                  <div className="row row--between">
                    <div>
                      <strong>{positionName}</strong>
                      <p className="helper-text">{businessName}</p>
                    </div>

                    <div>
                      <strong>Mutual Interest</strong>
                      <p>
                        {mutualInterest === true
                          ? "Yes"
                          : mutualInterest === false
                          ? "No"
                          : "Pending"}
                      </p>
                    </div>

                    <StatusBadge status={mutualInterest ? "success" : "pending"} />
                  </div>

                  <div className="grid grid--3">
                    <div>
                      <strong>Salary Range</strong>
                      <p>
                        {job.salary_min != null || job.salary_max != null
                          ? `$${job.salary_min ?? "?"} - $${job.salary_max ?? "?"}`
                          : "Not available"}
                      </p>
                    </div>

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
                  </div>

                  {linkedNegotiation ? (
                    <NegotiationPanel negotiation={linkedNegotiation} title="Negotiation Status" showChat={false}/>
                  ) : null}

                  <div className="row">
                    <Link
                      to={`/user/jobs/${job.id ?? interest.job.id}`}
                      className="button button--secondary"
                    >
                      View Job
                    </Link>

                    <button
                      className="button"
                      type="button"
                      disabled={
                        !mutualInterest ||
                        !!linkedNegotiation ||
                        actionLoadingId === interest.interest_id
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
