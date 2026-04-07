import useCountdown from "../../hooks/useCountdown";
import NegotiationChat from "./NegotiationChat";
import { useSocket } from "../../contexts/SocketContext";
import { useEffect, useState } from "react";

export default function NegotiationPanel({
  negotiation: initialNegotiation,
  title = "Negotiation",
  onAccept,
  onReject,
  actionLoading = false,
  role = null, 
  showChat = true, 
}) {
  const [negotiation, setNegotiation] = useState(initialNegotiation);
  const { socket } = useSocket();
  const { formatted, isExpired } = useCountdown(negotiation?.expiresAt);

  useEffect(() => {
    setNegotiation(initialNegotiation);
  }, [initialNegotiation]);

  useEffect(() => {
    if (!socket || !negotiation?.id) return;

    const handleStatusUpdate = (updatedData) => {
      if (updatedData.id === negotiation.id) {
        setNegotiation((prev) => ({
          ...prev,
          ...updatedData,
        }));
      }
    };

    socket.on("negotiation:status_updated", handleStatusUpdate);

    return () => {
      socket.off("negotiation:status_updated", handleStatusUpdate);
    };
  }, [socket, negotiation?.id]);

  useEffect(() => {
    if (socket && negotiation?.id) {
      socket.emit("negotiation:join", { negotiation_id: negotiation.id });
    }
  }, [socket, negotiation?.id]);

  if (!negotiation) return null;

  const candidateDecision =
    negotiation.decisions?.candidate === "accept"
      ? "Accepted"
      : negotiation.decisions?.candidate === "decline"
      ? "Rejected"
      : "Pending";

  const businessDecision =
    negotiation.decisions?.business === "accept"
      ? "Accepted"
      : negotiation.decisions?.business === "decline"
      ? "Rejected"
      : "Pending";

  const statusClass = (() => {
    if (negotiation.status === "success") return "badge badge--success";
    if (negotiation.status === "failed") return "badge badge--danger";
    if (negotiation.status === "expired" || isExpired) return "badge badge--warning";
    if (negotiation.status === "active") return "badge badge--info";
    return "badge badge--neutral";
  })();

  const hasCurrentUserDecided =
  role === "candidate"
    ? negotiation.decisions?.candidate !== null
    : role === "business"
    ? negotiation.decisions?.business !== null
    : false;

  const resolvedStatus =
    isExpired && negotiation.status === "active" ? "expired" : negotiation.status;

  return (
    <div className="card stack">
      <div className="row row--between">
        <h2 className="section-title" style={{ margin: 0 }}>
          {title}
        </h2>
        <span className={statusClass}>{resolvedStatus || "unknown"}</span>
      </div>

      <div className="grid grid--2">
        <div>
          <strong>Job</strong>
          <p>{`${negotiation.job?.position_type.name} - ${negotiation.job?.business.business_name}`}</p>
        </div>

        <div>
          <strong>User</strong>
          <p>{`${negotiation.user?.first_name} ${negotiation.user?.last_name}`}</p>
        </div>

        <div>
          <strong>Candidate Decision</strong>
          <p>{candidateDecision}</p>
        </div>

        <div>
          <strong>Business Decision</strong>
          <p>{businessDecision}</p>
        </div>

        <div>
          <strong>Expires At</strong>
          <p>
            {negotiation.expiresAt
              ? new Date(negotiation.expiresAt).toLocaleString()
              : "Unknown"}
          </p>
        </div>

        <div>
          <strong>Time Remaining</strong>
          <p>{isExpired ? "Expired" : formatted}</p>
        </div>
      </div>

      {resolvedStatus === "active" && !isExpired && showChat ? (
        <NegotiationChat negotiationId={negotiation.id} />
      ) : null}

      {resolvedStatus === "active" && !isExpired && !hasCurrentUserDecided ? (
        <div className="row">
          {onAccept ? (
            <button
              className="button"
              type="button"
              disabled={actionLoading}
              onClick={onAccept}
            >
              {actionLoading ? "Saving..." : "Accept"}
            </button>
          ) : null}

          {onReject ? (
            <button
              className="button button--danger"
              type="button"
              disabled={actionLoading}
              onClick={onReject}
            >
              {actionLoading ? "Saving..." : "Reject"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}