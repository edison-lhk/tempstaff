import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell";
import { getUsersApi, setUserSuspendedApi } from "../../api/admin";
import StatusBadge from "../../components/common/StatusBadge";
import ErrorAlert from "../../components/common/ErrorAlert";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { toAssetUrl } from "../../utils/helper";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [targetUser, setTargetUser] = useState(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [keyword]);

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError("");

        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("limit", String(limit));
        if (keyword.trim()) query.set("keyword", keyword.trim());

        const data = await getUsersApi(`?${query.toString()}`);
        const results = Array.isArray(data) ? data : data.results || [];
        setUsers(results);

        if (!Array.isArray(data)) {
          if (data.totalPages != null) {
            setTotalPages(data.totalPages);
          } else if (data.count != null) {
            setTotalPages(Math.max(1, Math.ceil(data.count / limit)));
          } else {
            setTotalPages(1);
          }
        } else {
          setTotalPages(1);
        }
      } catch (err) {
        setError(err.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [keyword, page, limit]);

  const toggleSuspended = async () => {
    if (!targetUser) return;

    try {
      setActionError("");
      const updated = await setUserSuspendedApi(targetUser.id, {
        suspended: !targetUser.suspended,
      });

      setUsers((current) =>
        current.map((item) => (item.id === targetUser.id ? updated : item))
      );
      setTargetUser(null);
    } catch (err) {
      setActionError(err.message || "Failed to update suspension status.");
    }
  };

  return (
    <PageShell
      title="Manage Users"
      subtitle="Review worker accounts and suspend or unsuspend them."
    >
      <div className="card stack">
        <div className="field">
          <label className="label" htmlFor="user-keyword">Search</label>
          <input
            id="user-keyword"
            className="input"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by name, email, postal address or phone number"
          />
        </div>
      </div>

      {loading ? <LoadingSpinner text="Loading users..." /> : null}
      <ErrorAlert message={error} />
      <ErrorAlert message={actionError} />

      {!loading && !error && users.length === 0 ? (
        <EmptyState message="No users found." />
      ) : null}

      {!loading && !error && users.length > 0 ? (
        <>
          <div className="stack">
            {users.map((user) => (
              <div key={user.id} className="card stack">
                <div className="row row--between">
                  <div
                    style={{
                      display: "flex",
                      gap: "1.5rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {user.avatar ? (
                      <img
                        src={toAssetUrl(user?.avatar || "")}
                        alt="avatar"
                        style={{
                          width: "110px",
                          height: "110px",
                          objectFit: "cover",
                          borderRadius: "16px",
                          border: "1px solid #d1d5db",
                        }}
                      />
                    ) : (
                      <div className="card card--muted" style={{ width: "110px", height: "110px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        No Avatar
                      </div>
                    )}

                    <div>
                      <strong>
                        {user.first_name || ""} {user.last_name || ""}
                      </strong>
                      <p className="helper-text">{user.email || "No email"}</p>
                    </div>
                  </div>

                  <StatusBadge status={user.suspended ? "suspended" : "active"} />
                </div>

                <div className="grid grid--2">
                  <div>
                    <strong>Phone</strong>
                    <p>{user.phone_number || "Not available"}</p>
                  </div>
                  <div>
                    <strong>Postal Address</strong>
                    <p>{user.postal_address || "Not available"}</p>
                  </div>
                </div>

                <div className="row">
                  <button
                    className={user.suspended ? "button" : "button button--secondary"}
                    type="button"
                    onClick={() => setTargetUser(user)}
                  >
                    {user.suspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      ) : null}

      <ConfirmDialog
        open={!!targetUser}
        title={targetUser?.suspended ? "Unsuspend user" : "Suspend user"}
        message={`Are you sure you want to ${targetUser?.suspended ? "unsuspend" : "suspend"} ${targetUser?.first_name || ""} ${targetUser?.last_name || ""}?`}
        confirmText={targetUser?.suspended ? "Unsuspend" : "Suspend"}
        cancelText="Cancel"
        isDanger={!targetUser?.suspended}
        onConfirm={toggleSuspended}
        onCancel={() => setTargetUser(null)}
      />
    </PageShell>
  );
}