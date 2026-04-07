export default function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const className = (() => {
    if (
      ["approved", "open", "active", "verified", "success", "available"].includes(
        normalized
      )
    ) {
      return "badge badge--success";
    }

    if (
      ["pending", "submitted", "expired", "warning", "revised"].includes(
        normalized
      )
    ) {
      return "badge badge--warning";
    }

    if (
      ["rejected", "cancelled", "canceled", "failed", "suspended"].includes(
        normalized
      )
    ) {
      return "badge badge--danger";
    }

    if (
      ["filled", "completed", "info"].includes(normalized)
    ) {
      return "badge badge--info";
    }

    return "badge badge--neutral";
  })();

  const label =
    normalized.length > 0
      ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
      : "Unknown";

  return <span className={className}>{label}</span>;
}