import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import {
  getQualificationByIdApi,
  updateQualificationApi,
} from "../../api/qualifications";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import StatusBadge from "../../components/common/StatusBadge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { toAssetUrl, getFileNameFromPath } from "../../utils/helper";

export default function AdminQualificationDetailPage() {
  const { qualificationId } = useParams();

  const [qualification, setQualification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    async function loadQualification() {
      try {
        setLoading(true);
        setError("");

        const data = await getQualificationByIdApi(qualificationId);
        setQualification(data);
      } catch (err) {
        setError(err.message || "Failed to load qualification detail.");
      } finally {
        setLoading(false);
      }
    }

    if (qualificationId) {
      loadQualification();
    }
  }, [qualificationId]);

  const user = qualification?.user || null;
  const positionType = qualification?.position_type || null;

  const fullName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || `User #${user.id}`
    : "";

  const avatarUrl = useMemo(() => toAssetUrl(user?.avatar || ""), [user]);
  const resumeUrl = useMemo(() => toAssetUrl(user?.resume || ""), [user]);
  const documentUrl = useMemo(
    () => toAssetUrl(qualification?.document || ""),
    [qualification]
  );

  const resumeFileName = getFileNameFromPath(user?.resume || "");
  const documentFileName = getFileNameFromPath(qualification?.document || "");

  const canReview =
    qualification?.status === "submitted" || qualification?.status === "revised";

  const handleDecision = async () => {
    if (!confirmAction || !qualification) return;

    try {
      setActionLoading(true);
      setActionError("");
      setSuccess("");

      const updated = await updateQualificationApi(qualification.id, {
        status: confirmAction,
      });

      setQualification({ ...qualification, status: updated.status });
      setSuccess(
        confirmAction === "approved"
          ? "Qualification approved successfully."
          : "Qualification rejected successfully."
      );
      setConfirmAction(null);
    } catch (err) {
      setActionError(err.message || "Failed to update qualification status.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageShell
      title="Qualification Detail"
      subtitle="Review the qualification request and candidate profile."
      actions={
        <div className="row">
          <Link
            to="/admin/qualifications"
            className="button button--secondary"
          >
            Back to Qualifications
          </Link>
        </div>
      }
    >
      {loading ? <LoadingSpinner text="Loading qualification..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />

      {!loading && !error && !qualification ? (
        <EmptyState message="Qualification not found." />
      ) : null}

      {!loading && !error && qualification ? (
        <div className="grid grid--2">
          <div className="card stack">
            <div className="row row--between">
                <div
                    style={{
                        display: "flex",
                        gap: "1.5rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >
                    {avatarUrl ? (
                        <img
                        src={avatarUrl}
                        alt={`${fullName} avatar`}
                        style={{
                            width: "110px",
                            height: "110px",
                            objectFit: "cover",
                            borderRadius: "16px",
                            border: "1px solid #d1d5db",
                        }}
                        />
                    ) : (
                        <div
                        className="card card--muted"
                        style={{
                            width: "110px",
                            height: "110px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        >
                        No Avatar
                        </div>
                    )}

                    <div>
                        <strong>{fullName}</strong>
                        <p className="helper-text">{user.email || "No email"}</p>
                    </div>
                </div>

                <StatusBadge status={qualification.status} />
            </div>

            <div>
              <strong>Biography</strong>
              <p>{user?.biography || "No biography provided."}</p>
            </div>

            <div>
              <strong>Phone Number</strong>
              <p>{user?.phone_number || "Not available"}</p>
            </div>

            <div>
              <strong>Postal Address</strong>
              <p>{user?.postal_address || "Not available"}</p>
            </div>

            <div>
              <strong>Birthday</strong>
              <p>{user?.birthday || "Not available"}</p>
            </div>

            <div>
              <strong>Account Status</strong>
              <p>
                {user?.activated ? "Activated" : "Not activated"}
                {user?.suspended ? " • Suspended" : " • Active"}
              </p>
            </div>

            <div className="stack">
              <strong>Resume</strong>
              {resumeUrl ? (
                <div className="card card--muted">
                  <div className="row row--between">
                    <span>{resumeFileName || "Resume"}</span>
                    <a
                      href={resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="button button--secondary button--sm"
                    >
                      View
                    </a>
                  </div>
                </div>
              ) : (
                <div className="card card--muted">
                    No resume uploaded.
                </div>
              )}
            </div>
          </div>

          <div className="stack">
            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Qualification Information
              </h2>

              <div>
                <strong>Position Type</strong>
                <p>{positionType?.name || `Position #${positionType?.id ?? "Unknown"}`}</p>
              </div>

              <div>
                <strong>Description</strong>
                <p>{positionType?.description || "No description provided."}</p>
              </div>

              <div>
                <strong>Note</strong>
                <p>{qualification.note || "No note provided."}</p>
              </div>

              <div className="stack">
                <strong>Document</strong>
                {documentUrl ? (
                  <div className="card card--muted">
                    <div className="row row--between">
                      <span>{documentFileName || "Document"}</span>
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="button button--secondary button--sm"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="card card--muted">
                    No qualification document uploaded.
                  </div>
                )}
              </div>

              <div>
                <strong>Last Updated</strong>
                <p>
                  {qualification.updatedAt
                    ? new Date(qualification.updatedAt).toLocaleString()
                    : "Unknown"}
                </p>
              </div>
            </div>

            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Review Decision
              </h2>

              {success ? <div className="card card--muted">{success}</div> : null}

              {canReview ? (
                <div className="row">
                  <button
                    type="button"
                    className="button"
                    disabled={actionLoading}
                    onClick={() => setConfirmAction("approved")}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    className="button button--danger"
                    disabled={actionLoading}
                    onClick={() => setConfirmAction("rejected")}
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
        </div>
      ) : null}

      <ConfirmDialog
        open={!!confirmAction}
        title={
          confirmAction === "approved"
            ? "Approve qualification"
            : "Reject qualification"
        }
        message={`Are you sure you want to ${
          confirmAction === "approved" ? "approve" : "reject"
        } this qualification request?`}
        confirmText={confirmAction === "approved" ? "Approve" : "Reject"}
        cancelText="Cancel"
        isDanger={confirmAction === "rejected"}
        onConfirm={handleDecision}
        onCancel={() => setConfirmAction(null)}
      />
    </PageShell>
  );
}