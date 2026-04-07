export default function EmptyState({ message = "Nothing to show." }) {
  return <div className="empty-state">{message}</div>;
}