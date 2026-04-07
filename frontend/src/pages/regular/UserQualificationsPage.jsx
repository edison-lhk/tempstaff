import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getPositionTypesApi } from "../../api/positionTypes";
import {
  createQualificationApi,
  updateQualificationApi,
} from "../../api/qualifications";
import { getQualificationsApi } from "../../api/users";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination from "../../components/common/Pagination";

export default function UserQualificationsPage() {
  const [positionTypes, setPositionTypes] = useState([]);
  const [qualifications, setQualifications] = useState([]);
  const [selectedPositionTypeId, setSelectedPositionTypeId] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
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

        const [positionTypesData, qualificationsData] = await Promise.all([
          getPositionTypesApi(),
          getQualificationsApi(`?page=${page}&limit=${limit}`),
        ]);

        const positionTypeResults = Array.isArray(positionTypesData)
          ? positionTypesData
          : positionTypesData.results || [];

        const qualificationResults = Array.isArray(qualificationsData)
          ? qualificationsData
          : qualificationsData.results || [];

        setPositionTypes(positionTypeResults);
        setQualifications(qualificationResults);

        if (!Array.isArray(qualificationsData) && typeof qualificationsData.count === "number") {
          setTotalPages(Math.max(1, Math.ceil(qualificationsData.count / limit)));
        } else {
          setTotalPages(1);
        }
      } catch (err) {
        setError(err.message || "Failed to load qualifications.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [page, limit]);

  const requestedPositionTypeIds = useMemo(() => {
    return new Set(
      qualifications
        .map((qualification) =>
          qualification.positionType?.id ??
          qualification.position_type?.id ??
          qualification.positionTypeId ??
          qualification.position_type_id ??
          null
        )
        .filter(Boolean)
    );
  }, [qualifications]);

  const handleCreateQualification = async (event) => {
    event.preventDefault();
    setCreateError("");
    setActionError("");
    setSuccess("");

    if (!selectedPositionTypeId) {
      setCreateError("Please select a position type.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        position_type_id: Number(selectedPositionTypeId),
        ...(note.trim() ? { note: note.trim() } : {}),
      };

      const created = await createQualificationApi(payload);

      setQualifications((current) => [created, ...current]);
      setSelectedPositionTypeId("");
      setNote("");
      setSuccess("Qualification request created successfully.");

      setTotalPages((current) =>
        Math.max(current, Math.ceil((qualifications.length + 1) / limit))
      );
    } catch (err) {
      setCreateError(err.message || "Failed to create qualification request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (qualification, nextStatus) => {
    setActionError("");
    setCreateError("");
    setSuccess("");
    setActionLoadingId(qualification.id);

    try {
      const updated = await updateQualificationApi(qualification.id, {
        status: nextStatus,
      });

      setQualifications((current) =>
        current.map((item) => (item.id === qualification.id ? updated : item))
      );

      if (nextStatus === "submitted") {
        setSuccess("Qualification submitted successfully.");
      } else if (nextStatus === "revised") {
        setSuccess("Qualification marked as revised successfully.");
      }
    } catch (err) {
      setActionError(err.message || "Failed to update qualification status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getAvailableAction = (status) => {
    if (status === "created") {
      return {
        label: "Submit",
        nextStatus: "submitted",
        buttonClass: "button",
      };
    }

    if (status === "approved" || status === "rejected") {
      return {
        label: "Mark as Revised",
        nextStatus: "revised",
        buttonClass: "button button--secondary",
      };
    }

    return null;
  };

  return (
    <PageShell
      title="My Qualifications"
      subtitle="Create qualification requests and track their statuses."
    >
      {loading ? <LoadingSpinner text="Loading qualifications..." /> : null}
      <ErrorAlert message={error} />

      {!loading ? (
        <>
          <div className="card stack">
            <h2 className="section-title" style={{ margin: 0 }}>
              Request a Qualification
            </h2>

            <form className="stack" onSubmit={handleCreateQualification}>
              <div className="field">
                <label className="label" htmlFor="positionTypeId">
                  Position Type
                </label>
                <select
                  id="positionTypeId"
                  className="select"
                  value={selectedPositionTypeId}
                  onChange={(event) => setSelectedPositionTypeId(event.target.value)}
                >
                  <option value="">Select a position type</option>
                  {positionTypes
                    .filter((positionType) => !positionType.hidden)
                    .map((positionType) => (
                      <option key={positionType.id} value={positionType.id}>
                        {positionType.name || positionType.title || `Position #${positionType.id}`}
                        {requestedPositionTypeIds.has(positionType.id)
                          ? " (already requested)"
                          : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="qualification-note">
                  Note
                </label>
                <textarea
                  id="qualification-note"
                  className="textarea"
                  rows="3"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add context for the admin reviewing this qualification."
                />
              </div>

              <ErrorAlert message={createError} />
              <ErrorAlert message={actionError} />
              {success ? <div className="card card--muted">{success}</div> : null}

              <div className="row">
                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Create Qualification Request"}
                </button>
              </div>
            </form>
          </div>

          <div className="card stack">
            <h2 className="section-title" style={{ margin: 0 }}>
              My Qualification Requests
            </h2>

            {qualifications.length === 0 ? (
              <EmptyState message="No qualification requests found." />
            ) : (
              <>
                <div className="stack">
                  {qualifications.map((qualification) => {
                    const positionTypeName =
                      qualification.positionType?.name ||
                      qualification.position_type?.name ||
                      qualification.positionType?.title ||
                      qualification.position_type?.title ||
                      positionTypes.find(
                        (positionType) =>
                          positionType.id ===
                          (qualification.positionTypeId ?? qualification.position_type_id)
                      )?.name ||
                      `Position #${
                        qualification.positionTypeId ??
                        qualification.position_type_id ??
                        "Unknown"
                      }`;

                    const updatedAt =
                      qualification.updatedAt ||
                      qualification.updated_at ||
                      qualification.createdAt ||
                      qualification.created_at;

                    const availableAction = getAvailableAction(qualification.status);

                    return (
                      <div key={qualification.id} className="card card--muted stack">
                        <div className="row row--between">
                          <div>
                            <strong>{positionTypeName}</strong>
                          </div>
                          <StatusBadge status={qualification.status} />
                        </div>

                        <div className="helper-text">
                          Last updated:{" "}
                          {updatedAt ? new Date(updatedAt).toLocaleString() : "Unknown"}
                        </div>

                        {qualification.note ? <p>{qualification.note}</p> : null}

                        <div className="row">
                          <Link
                            to={`/user/qualifications/${qualification.id}`}
                            className="button button--secondary"
                          >
                            View Details
                          </Link>

                          {availableAction ? (
                            <button
                              type="button"
                              className={availableAction.buttonClass}
                              disabled={actionLoadingId === qualification.id}
                              onClick={() =>
                                handleStatusUpdate(
                                  qualification,
                                  availableAction.nextStatus
                                )
                              }
                            >
                              {actionLoadingId === qualification.id
                                ? "Updating..."
                                : availableAction.label}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </>
      ) : null}
    </PageShell>
  );
}