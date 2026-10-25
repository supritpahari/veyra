import { Link, useLocation } from 'react-router-dom';
import { Logo } from './vh-ui';

export function Navbar() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <header className="vh-top">
      <div className="vh-top__in">
        <Link to="/" className="vh-logo" aria-label="Veyra Health Home">
          <Logo />
          <span>Veyra Health</span>
        </Link>

        {/* Removed middle Overview/Dashboard navlinks as requested */}
        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isDashboard ? (
            <Link to="/" className="vh-btn vh-btn--sm vh-btn--ghost">
              ← Back to Overview
            </Link>
          ) : (
            <Link to="/dashboard/analyzer" className="vh-btn vh-btn--sm vh-btn--primary">
              Open Dashboard →
            </Link>
          )}
          <span className="vh-top__tag">PROTOTYPE · NOT DIAGNOSTIC</span>
        </div>
      </div>
    </header>
  );
}
