import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell";
import { getPositionTypesApi } from "../../api/positionTypes";
import {
  getQualificationByIdApi,
  updateQualificationApi,
  uploadQualificationDocumentApi,
} from "../../api/qualifications";
import { toAssetUrl, getFileNameFromPath } from "../../utils/helper";

export default function QualificationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [qualification, setQualification] = useState(null);
  const [positionTypes, setPositionTypes] = useState([]);
  const [note, setNote] = useState("");
  const [documentFile, setDocumentFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [noteSuccess, setNoteSuccess] = useState("");
  const [documentSuccess, setDocumentSuccess] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [qualificationData, positionTypesData] = await Promise.all([
          getQualificationByIdApi(id),
          getPositionTypesApi(),
        ]);

        const positionTypeResults = Array.isArray(positionTypesData)
          ? positionTypesData
          : positionTypesData.results || [];

        setQualification(qualificationData);
        setPositionTypes(positionTypeResults);
        setNote(qualificationData.note || "");
      } catch (err) {
        setError(err.message || "Failed to load qualification.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const positionTypeName = useMemo(() => {
    if (!qualification) return "";

    return (
      qualification.position_type?.name ||
      qualification.position_type?.title ||
      positionTypes.find(
        (positionType) => positionType.id === qualification.position_type_id
      )?.name ||
      `Position #${qualification.position_type_id ?? "Unknown"}`
    );
  }, [qualification, positionTypes]);

  const isEditable = useMemo(() => {
    if (!qualification?.status) return false;
    return ["rejected", "revised", "draft", "created"].includes(
      qualification.status
    );
  }, [qualification]);

  const availableStatusAction = useMemo(() => {
    if (!qualification?.status) return null;

    if (qualification.status === "created") {
      return {
        label: "Submit Qualification",
        nextStatus: "submitted",
        buttonClass: "button",
      };
    }

    if (qualification.status === "approved" || qualification.status === "rejected") {
      return {
        label: "Mark as Revised",
        nextStatus: "revised",
        buttonClass: "button button--secondary",
      };
    }

    return null;
  }, [qualification]);

  const documentUrl = useMemo(() => {
    return toAssetUrl(qualification?.document || "");
  }, [qualification]);

  const documentName = useMemo(() => {
    return getFileNameFromPath(qualification?.document || "");
  }, [qualification]);

  const statusClass = (status) => {
    if (status === "approved") return "badge badge--success";
    if (status === "rejected") return "badge badge--danger";
    if (status === "pending" || status === "submitted" || status === "revised") return "badge badge--warning";
    return "badge badge--neutral";
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaveError("");
    setUploadError("");
    setStatusError("");
    setStatusSuccess("");
    setNoteSuccess("");
    setDocumentSuccess("");

    if (!qualification) return;

    setIsSaving(true);

    try {
      const updated = await updateQualificationApi(qualification.id, {
        note: note.trim(),
      });

      setQualification({ ...updated, note: updated.note });
      setNoteSuccess("Qualification updated successfully.");
    } catch (err) {
      setSaveError(err.message || "Failed to update qualification.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setUploadError("");
    setSaveError("");
    setStatusError("");
    setStatusSuccess("");
    setNoteSuccess("");
    setDocumentSuccess("");

    if (!qualification) return;
    if (!documentFile) {
      setUploadError("Please choose a document to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", documentFile);

      const updated = await uploadQualificationDocumentApi(
        qualification.id,
        formData
      );

      setDocumentFile(null);
      setQualification({ ...qualification, document: updated.document });
      setDocumentSuccess("Qualification document uploaded successfully.");
    } catch (err) {
      setUploadError(err.message || "Failed to upload qualification document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!qualification || !availableStatusAction) return;

    setStatusError("");
    setStatusSuccess("");
    setSaveError("");
    setUploadError("");
    setNoteSuccess("");
    setDocumentSuccess("");
    setIsUpdatingStatus(true);

    try {
      const updated = await updateQualificationApi(qualification.id, {
        status: availableStatusAction.nextStatus,
      });

      setQualification(updated);

      if (availableStatusAction.nextStatus === "submitted") {
        setDocumentSuccess("Qualification submitted successfully.");
      } else if (availableStatusAction.nextStatus === "revised") {
        setDocumentSuccess("Qualification marked as revised successfully.");
      }
    } catch (err) {
      setStatusError(err.message || "Failed to update qualification status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <PageShell
      title="Qualification Detail"
      subtitle="Review your qualification request and update it when allowed."
      actions={
        <button
          type="button"
          className="button button--secondary"
          onClick={() => navigate("/user/qualifications")}
        >
          Back
        </button>
      }
    >
      {loading ? <div className="card">Loading qualification...</div> : null}
      {error ? <div className="error-alert">{error}</div> : null}

      {!loading && !error && !qualification ? (
        <div className="empty-state">Qualification not found.</div>
      ) : null}

      {!loading && !error && qualification ? (
        <div className="grid grid--2">
          <div className="card stack">
            <div className="row row--between">
              <h2 className="section-title" style={{ margin: 0 }}>
                {positionTypeName}
              </h2>
              <span className={statusClass(qualification.status)}>
                {qualification.status || "unknown"}
              </span>
            </div>

            <div>
              <strong>Note</strong>
              <p>{qualification.note ?? "Empty"}</p>
            </div>

            <div>
              <strong>Last Updated</strong>
              <p>
                {qualification.updated_at || qualification.updatedAt
                  ? new Date(
                      qualification.updated_at || qualification.updatedAt
                    ).toLocaleString()
                  : "Unknown"}
              </p>
            </div>

            <div className="stack">
              <strong>Document</strong>
                {documentUrl ? (
                  <div className="card card--muted">
                    <div className="row row--between">
                      <span>{documentName || "Uploaded document"}</span>

                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="button button--secondary"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="card card--muted">
                    No document uploaded yet.
                  </div>
                )}
            </div>

            {availableStatusAction ? (
              <div className="stack">
                <h2 className="section-title" style={{ margin: 0 }}>
                  Status Action
                </h2>

                {statusError ? <div className="error-alert">{statusError}</div> : null}
                {statusSuccess ? <div className="card card--muted">{statusSuccess}</div> : null}

                <button
                  type="button"
                  className={availableStatusAction.buttonClass}
                  disabled={isUpdatingStatus}
                  onClick={handleStatusUpdate}
                >
                  {isUpdatingStatus ? "Updating..." : availableStatusAction.label}
                </button>
              </div>
            ) : null}

            {!isEditable && !availableStatusAction ? (
              <div className="card card--muted">
                This qualification is currently not editable.
              </div>
            ) : null}
          </div>

          <div className="stack">
            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Update Note
              </h2>

              <form className="stack" onSubmit={handleSave}>
                <div className="field">
                  <label className="label" htmlFor="note">
                    Note
                  </label>
                  <textarea
                    id="note"
                    className="textarea"
                    rows="5"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    disabled={!isEditable}
                  />
                </div>

                {saveError ? <div className="error-alert">{saveError}</div> : null}
                {noteSuccess ? <div className="card card--muted">{noteSuccess}</div> : null}

                <button
                  className="button"
                  type="submit"
                  disabled={!isEditable || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Note"}
                </button>
              </form>
            </div>

            <div className="card stack">
              <h2 className="section-title" style={{ margin: 0 }}>
                Upload Document
              </h2>

              <form className="stack" onSubmit={handleUpload}>
                <div className="field">
                  <label className="label" htmlFor="qualification-document">
                    Qualification Document
                  </label>
                  <input
                    id="qualification-document"
                    type="file"
                    className="input"
                    onChange={(event) =>
                      setDocumentFile(event.target.files?.[0] || null)
                    }
                    disabled={!isEditable}
                  />
                </div>

                {uploadError ? <div className="error-alert">{uploadError}</div> : null}
                {documentSuccess ? <div className="card card--muted">{documentSuccess}</div> : null}

                <button
                  className="button"
                  type="submit"
                  disabled={!isEditable || isUploading}
                >
                  {isUploading ? "Uploading..." : "Upload Document"}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}