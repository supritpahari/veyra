import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Logo } from './vh-ui';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const { user, isLoading, logout } = useAuth();
  const [authActionError, setAuthActionError] = useState<string | null>(null);

  async function handleLogout() {
    setAuthActionError(null);
    try {
      await logout();
      navigate('/');
    } catch (cause) {
      setAuthActionError(
        cause instanceof Error ? cause.message : 'Sign out failed. Please try again.',
      );
    }
  }

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
          {user ? (
            <>
              <span className="vh-top__user" title={user.email}>
                {user.email}
              </span>
              <button
                type="button"
                className="vh-btn vh-btn--sm vh-btn--ghost"
                onClick={() => void handleLogout()}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="vh-btn vh-btn--sm vh-btn--ghost"
              aria-busy={isLoading}
            >
              Sign in
            </Link>
          )}
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
      {authActionError && (
        <p className="vh-auth-nav-error" role="alert">{authActionError}</p>
      )}
    </header>
  );
}
