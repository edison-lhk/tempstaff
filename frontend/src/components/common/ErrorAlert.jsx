export default function ErrorAlert({ message }) {
  if (!message) return null;

  return <div className="error-alert">{message}</div>;
}