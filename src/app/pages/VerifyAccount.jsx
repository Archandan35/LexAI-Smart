import { useSearchParams, Link } from 'react-router-dom';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import Icon from '@/components/Icon.jsx';
import Button from '@/components/Button.jsx';

export default function VerifyAccount() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') || 'pending';

  return (
    <div className="auth-shell">
      <div className="auth-card fade-in">
        <div className="auth-card__logo">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteTitle} className="auth-card__logo-img" />
          ) : (
            <div className="auth-card__logo-fallback">{settings.siteTitle?.charAt(0) || 'V'}</div>
          )}
        </div>

        {status === 'success' ? (
          <>
            <div className="auth-confirm">
              <div className="auth-confirm__icon"><Icon name="check" size={32} /></div>
              <h1 className="auth-title">Email Verified</h1>
              <p className="auth-sub">Your account has been verified successfully.</p>
            </div>
            <Button variant="primary" className="btn--block" onClick={() => window.location.href = '/login'}>
              Sign in
            </Button>
          </>
        ) : status === 'error' ? (
          <>
            <div className="auth-confirm">
              <div className="auth-confirm__icon auth-confirm__icon--danger"><Icon name="x" size={32} /></div>
              <h1 className="auth-title">Verification Failed</h1>
              <p className="auth-sub">The verification link is invalid or has expired.</p>
            </div>
            <div className="alert alert--warn alert--mb">
              <Icon name="alert" size={16} />
              <span>Please contact an administrator or request a new verification email.</span>
            </div>
            <div className="auth-foot">
              <Link to="/login" className="auth-link">&larr; Back to sign in</Link>
            </div>
          </>
        ) : (
          <>
            <div className="auth-confirm">
              <div className="auth-confirm__icon auth-confirm__icon--warning"><Icon name="clock" size={32} /></div>
              <h1 className="auth-title">Verify your email</h1>
              <p className="auth-sub">We sent a verification link to your email address.</p>
              <p className="auth-sub auth-sub--sm">Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.</p>
            </div>
            <div className="auth-foot">
              <Link to="/login" className="auth-link">&larr; Back to sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

