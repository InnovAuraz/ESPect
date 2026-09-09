import { AlertIcon } from "./Icons";

export default function ErrorBanner({ message }) {
  if (!message) return null;

  return (
    <div className="error-banner">
      <span className="error-banner-icon">
        <AlertIcon />
      </span>
      <span>{message}</span>
    </div>
  );
}
