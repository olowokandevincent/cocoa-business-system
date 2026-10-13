import { Link } from "react-router-dom";

// A real cocoa pod photograph, framed in a gold ring — the app's logo.
export const COCOA_LOGO = "/cocoa/logo.jpg";

export function CocoaMark({ className = "ce-logo" }) {
  return (
    <span className={className} data-testid="brand-logo-mark">
      <img src={COCOA_LOGO} alt="Cocoa pods" />
    </span>
  );
}

export function CocoaBrand({ subtitle = "Private Business Records", className = "" }) {
  return (
    <Link to="/" className={`ce-brand ${className}`} data-testid="brand-logo">
      <CocoaMark />
      <span className="ce-word">
        <b>Cocoa Ledger</b>
        <span>{subtitle}</span>
      </span>
    </Link>
  );
}
