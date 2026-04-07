import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getInvitationsApi } from "../../api/users";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination from "../../components/common/Pagination";

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const invitationsData = await getInvitationsApi(`?page=${page}&limit=${limit}`);

        const results = invitationsData.results || [];
        setInvitations(results);

        if (!Array.isArray(invitationsData)) {
          if (invitationsData.totalPages != null) {
            setTotalPages(invitationsData.totalPages);
          } else if (invitationsData.count != null) {
            setTotalPages(Math.max(1, Math.ceil(invitationsData.count / limit)));
          } else {
            setTotalPages(1);
          }
        } else {
          setTotalPages(1);
        }
      } catch (err) {
        setError(err.message || "Failed to load invitations.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [page, limit]);

  return (
    <PageShell
      title="Invitations"
      subtitle="Review jobs where businesses have expressed interest in you."
    >
      {loading ? <LoadingSpinner text="Loading invitations..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && invitations.length === 0 ? (
        <EmptyState message="You have no invitations right now." />
      ) : null}

      {!loading && !error && invitations.length > 0 ? (
        <>
          <div className="stack">
            {invitations.map((invitation) => {
              const positionName = invitation.position_type?.name || "Unknown";

              const businessName = invitation.business?.business_name || "Unknown";

              return (
                <div key={invitation.id} className="card stack">
                  <div className="row row--between">
                    <div>
                      <strong>{positionName}</strong>
                      <p className="helper-text">{businessName}</p>
                    </div>

                    <StatusBadge status={invitation.status} />
                  </div>

                  <div className="grid grid--3">
                    <div>
                      <strong>Salary Range</strong>
                      <p>
                        {invitation.salary_min != null || invitation.salary_max != null
                          ? `$${invitation.salary_min ?? "?"} - $${invitation.salary_max ?? "?"}`
                          : "Not available"}
                      </p>
                    </div>

                    <div>
                      <strong>Work Window</strong>
                      <p>
                        {invitation.start_time
                          ? `Start: ${new Date(invitation.start_time).toLocaleString()}`
                          : "Unknown"}
                      </p>
                      <p>
                        {invitation.end_time
                          ? `End: ${new Date(invitation.end_time).toLocaleString()}`
                          : "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="row">
                    <Link
                      to={`/user/jobs/${invitation.id}`}
                      className="button button--secondary"
                    >
                      View Job
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