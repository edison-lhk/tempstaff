import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getAdminQualificationsApi, updateAdminQualificationApi } from "../../api/admin";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminQualificationsPage() {
  const [qualifications, setQualifications] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

   useEffect(() => {
    setPage(1);
  }, [keyword]);

  useEffect(() => {
    async function loadQualifications() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(limit));

        if (keyword.trim()) query.set("keyword", keyword.trim());

        const data = await getAdminQualificationsApi(`?${query.toString()}`);
        const results = Array.isArray(data) ? data : data.results || [];
        setQualifications(results);

        if (!Array.isArray(data) && typeof data.count === "number") {
          setTotalPages(Math.max(1, Math.ceil(data.count / limit)));
        } else {
          setTotalPages(1);
        }
      } catch (err) {
        setError(err.message || "Failed to load qualifications.");
      } finally {
        setLoading(false);
      }
    }

    loadQualifications();
  }, [page, keyword]);

  const updateStatus = async () => {
    if (!confirmAction) return;

    try {
      setActionError("");

      const updated = await updateAdminQualificationApi(confirmAction.qualification.id, {
        status: confirmAction.status,
      });

      setQualifications((current) =>
        current.map((item) =>
          item.id === confirmAction.qualification.id ? updated : item
        )
      );

      setConfirmAction(null);
    } catch (err) {
      setActionError(err.message || "Failed to update qualification status.");
    }
  };

  return (
    <PageShell
      title="Qualification Review"
      subtitle="Review qualification requests and update their statuses."
    >
      <div className="card stack">
        <div className="field">
          <label className="label" htmlFor="business-keyword">
            Search
          </label>
          <input
            id="qualification-keyword"
            className="input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Search by first name, last name, email or phone number"
          />
        </div>
      </div>

      {loading ? <LoadingSpinner text="Loading qualifications..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />

      {!loading && !error && qualifications.length === 0 ? (
        <EmptyState message="No qualification requests found." />
      ) : null}

      {!loading && !error && qualifications.length > 0 ? (
        <>
          <div className="stack">
            {qualifications.map((qualification) => {
              const canReview =
                qualification.status === "submitted" ||
                qualification.status === "revised";

              return (
                <div key={qualification.id} className="card stack">
                  <div className="row row--between">
                    <div>
                      <strong>
                        {qualification.user?.first_name || ""}{" "}
                        {qualification.user?.last_name || ""}
                      </strong>
                      <p className="helper-text">
                        {qualification.position_type?.name ||
                          `Position #${
                            qualification.position_type?.id ??
                            "Unknown"
                          }`}
                      </p>
                    </div>

                    <StatusBadge status={qualification.status} />
                  </div>

                  <div>
                    <strong>Note</strong>
                    <p>{qualification.note || "No note provided."}</p>
                  </div>
                  
                  <div className="row">
                    <Link
                      to={`/admin/qualifications/${qualification.id}`}
                      className="button button--secondary"
                    >
                      View Details
                    </Link>

                    {canReview ? (
                      <div className="row">
                        <button
                          className="button"
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              qualification,
                              status: "approved",
                            })
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="button button--danger"
                          type="button"
                          onClick={() =>
                            setConfirmAction({
                              qualification,
                              status: "rejected",
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="card card--muted">
                        This qualification has already been reviewed.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}

      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction?.status === "approved"
            ? "Approve qualification"
            : "Reject qualification"
        }
        message={`Are you sure you want to ${
          confirmAction?.status === "approved" ? "approve" : "reject"
        } this qualification request?`}
        confirmText={confirmAction?.status === "approved" ? "Approve" : "Reject"}
        cancelText="Cancel"
        isDanger={confirmAction?.status !== "approved"}
        onConfirm={updateStatus}
        onCancel={() => setConfirmAction(null)}
      />
    </PageShell>
  );
}