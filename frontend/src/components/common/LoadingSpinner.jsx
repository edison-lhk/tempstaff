export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="card row">
      <span className="loading-spinner" />
      <span>{text}</span>
    </div>
  );
}