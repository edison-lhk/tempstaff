import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import {
  createAdminPositionTypeApi,
  deleteAdminPositionTypeApi,
  getAdminPositionTypesApi,
  updateAdminPositionTypeApi,
} from "../../api/admin";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminPositionTypesPage() {
  const [positionTypes, setPositionTypes] = useState([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visibilityTarget, setVisibilityTarget] = useState(null);

  useEffect(() => {
    async function loadPositionTypes() {
      try {
        setLoading(true);
        setError("");
        const data = await getAdminPositionTypesApi();
        setPositionTypes(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        setError(err.message || "Failed to load position types.");
      } finally {
        setLoading(false);
      }
    }

    loadPositionTypes();
  }, []);

  const createPositionType = async (event) => {
    event.preventDefault();
    setActionError("");
    setSuccess("");

    if (!newName.trim()) {
      setActionError("Position type name is required.");
      return;
    }

    if (!newDescription.trim()) {
      setActionError("Description is required.");
      return;
    }

    try {
      const created = await createAdminPositionTypeApi({ name: newName.trim(), description: newDescription.trim(),
        hidden: true, });
      setPositionTypes((current) => [created, ...current]);
      setNewName("");
      setNewDescription(""); 
      setSuccess("Position type created successfully.");
    } catch (err) {
      setActionError(err.message || "Failed to create position type.");
    }
  };

  const confirmToggleHidden = async () => {
    if (!visibilityTarget) return;

    try {
      setActionError("");
      setSuccess("");

      const updated = await updateAdminPositionTypeApi(visibilityTarget.id, {
        hidden: !visibilityTarget.hidden,
      });

      setPositionTypes((current) =>
        current.map((item) => (item.id === visibilityTarget.id ? updated : item))
      );

      setSuccess(
        visibilityTarget.hidden
          ? "Position type is now visible."
          : "Position type has been hidden."
      );
      setVisibilityTarget(null);
    } catch (err) {
      setActionError(err.message || "Failed to update position type.");
    }
  };

  const confirmDeletePositionType = async () => {
    if (!deleteTarget) return;

    try {
      setActionError("");
      setSuccess("");

      await deleteAdminPositionTypeApi(deleteTarget.id);
      setPositionTypes((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );

      setSuccess("Position type deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err.message || "Failed to delete position type.");
    }
  };

  return (
    <PageShell
      title="Position Types"
      subtitle="Create, hide, unhide, and delete position types."
    >
      <div className="card stack">
        <h2 className="section-title" style={{ margin: 0 }}>
          Create Position Type
        </h2>

        <form className="row" onSubmit={createPositionType}>
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter position type name"
          />
          <input
            className="input"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
          />
          <button className="button" type="submit">
            Create
          </button>
        </form>

        <ErrorAlert message={actionError} />
        {success ? <div className="card card--muted">{success}</div> : null}
      </div>

      {loading ? <LoadingSpinner text="Loading position types..." /> : null}
      <ErrorAlert message={error} />

      {!loading && !error && positionTypes.length === 0 ? (
        <EmptyState message="No position types found." />
      ) : null}

      {!loading && !error && positionTypes.length > 0 ? (
        <div className="stack">
          {positionTypes.map((positionType) => (
            <div key={positionType.id} className="card stack">
              <div className="row row--between">
                <strong>
                  {positionType.name || positionType.title || `Position #${positionType.id}`}
                </strong>
                <StatusBadge status={positionType.hidden ? "pending" : "active"} />
              </div>

              <div>
                <strong>Description</strong>
                <p>{positionType.description || "No description provided."}</p>
              </div>

              <div>
                <strong>Hidden</strong>
                <p>{(positionType.hidden ? "Yes" : "No") || "Pending"}</p>
              </div>

              <div>
                <strong>Number of qualified candidates</strong>
                <p>{positionType.num_qualified || "Unavailable"}</p>
              </div>

              <div className="row">
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => setVisibilityTarget(positionType)}
                >
                  {positionType.hidden ? "Unhide" : "Hide"}
                </button>

                <button
                  className="button button--danger"
                  type="button"
                  onClick={() => setDeleteTarget(positionType)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        open={!!visibilityTarget}
        title={visibilityTarget?.hidden ? "Unhide position type" : "Hide position type"}
        message={
          visibilityTarget?.hidden
            ? `Are you sure you want to unhide "${visibilityTarget?.name || "this position type"}"?`
            : `Are you sure you want to hide "${visibilityTarget?.name || "this position type"}"?`
        }
        confirmText={visibilityTarget?.hidden ? "Unhide" : "Hide"}
        cancelText="Cancel"
        isDanger={!visibilityTarget?.hidden}
        onConfirm={confirmToggleHidden}
        onCancel={() => setVisibilityTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete position type"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this position type"}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmDeletePositionType}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}