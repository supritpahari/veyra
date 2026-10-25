import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Logo } from './vh-ui';

interface AuthPageProps {
  initialMode: 'login' | 'register';
}

function authErrorMessage(error: string) {
  const messages: Record<string, string> = {
    invalid_credentials: 'The email or password is incorrect.',
    email_already_registered: 'An account with this email already exists.',
    too_many_auth_attempts: 'Too many attempts. Please wait a few minutes and try again.',
    google_oauth_not_configured: 'Google sign-in is not configured on the API yet.',
    google_account_conflict: 'This Google account conflicts with an existing account.',
    invalid_oauth_state: 'The Google sign-in request expired. Please try again.',
  };
  return messages[error] ?? error.replaceAll('_', ' ');
}

export function AuthPage({ initialMode }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, startGoogleLogin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isRegister = initialMode === 'register';
  const oauthError = new URLSearchParams(location.search).get('authError');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (isRegister && password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/dashboard/analyzer', { replace: true });
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? authErrorMessage(cause.message)
          : 'Unable to authenticate. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function googleSignIn() {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await startGoogleLogin();
    } catch (cause) {
      setFormError(
        cause instanceof Error
          ? authErrorMessage(cause.message)
          : 'Google sign-in could not be started.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <section className="vh-auth">
      <div className="vh-auth__aside">
        <Link to="/" className="vh-logo" aria-label="Veyra Health Home">
          <Logo />
          <span>Veyra Health</span>
        </Link>
        <div className="vh-auth__story">
          <span className="vh-auth__eyebrow">EVIDENCE FIRST · HUMAN REVIEW</span>
          <h1>Understand your results. See the evidence.</h1>
          <p>
            Your account keeps your Veyra session secure while you explore your
            lab report workspace.
          </p>
          <div className="vh-auth__promise">
            <span aria-hidden="true">✓</span>
            Your password stays private
          </div>
          <div className="vh-auth__promise">
            <span aria-hidden="true">✓</span>
            Sign-in is managed securely by Veyra
          </div>
        </div>
        <p className="vh-auth__disclaimer">
          Veyra is a prototype, not a diagnostic system. Use synthetic or
          de-identified reports only.
        </p>
      </div>

      <div className="vh-auth__panel">
        <div className="vh-auth__form-wrap">
          <span className="vh-auth__eyebrow">
            {isRegister ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}
          </span>
          <h2>{isRegister ? 'Get started with Veyra' : 'Sign in to Veyra'}</h2>
          <p className="vh-auth__subhead">
            {isRegister
              ? 'Create an account to continue to your workspace.'
              : 'Use your email and password to continue.'}
          </p>

          {(formError || oauthError) && (
            <div className="vh-auth__error" role="alert">
              {authErrorMessage(formError || oauthError || '')}
            </div>
          )}

          <form className="vh-auth__form" onSubmit={submit}>
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {isRegister && (
              <>
                <label htmlFor="auth-confirm-password">Confirm password</label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <p className="vh-auth__hint">Use 8–128 characters.</p>
              </>
            )}

            <button
              className="vh-btn vh-btn--primary vh-auth__submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Please wait…'
                : isRegister
                  ? 'Create account'
                  : 'Sign in'}
            </button>
          </form>

          <div className="vh-auth__separator"><span>or</span></div>
          <button
            className="vh-btn vh-btn--ghost vh-auth__google"
            type="button"
            disabled={isSubmitting}
            onClick={() => void googleSignIn()}
          >
            <span className="vh-auth__google-mark" aria-hidden="true">G</span>
            Continue with Google
          </button>

          <p className="vh-auth__switch">
            {isRegister ? 'Already have an account?' : 'New to Veyra?'}{' '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
