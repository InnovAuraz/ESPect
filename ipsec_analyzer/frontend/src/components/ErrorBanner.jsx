// ErrorBanner.jsx
export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="error-banner">
      <span style={{ color: "var(--neon-red)", textShadow: "var(--shadow-glow-red)", fontWeight: "800" }}>⚠</span>
      <span>{message}</span>
    </div>
  );
}