export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <span>⚠</span>
      <span>{message}</span>
    </div>
  );
}
