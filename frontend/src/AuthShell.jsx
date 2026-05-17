import React from "react";
import { Link } from "react-router-dom";

const AuthShell = ({
  eyebrow,
  title,
  subtitle,
  sideTitle,
  sideCopy,
  highlights,
  footerText,
  footerLinkTo,
  footerLinkLabel,
  children,
}) => {
  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel-featured">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hero-copy">{subtitle}</p>

        <div className="feature-stack">
          <div className="feature-card">
            <h2>{sideTitle}</h2>
            <p>{sideCopy}</p>
          </div>

          <div className="mini-grid">
            {highlights.map((item) => (
              <div className="mini-card" key={item.label}>
                <span>{item.value}</span>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-panel auth-panel-form">
        {children}
        <p className="auth-footer">
          {footerText} <Link to={footerLinkTo}>{footerLinkLabel}</Link>
        </p>
      </div>
    </div>
  );
};

export default AuthShell;
