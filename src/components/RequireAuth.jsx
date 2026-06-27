import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useSettings } from '@/data-layer/SettingsContext.jsx';
import Spinner from './Spinner.jsx';

// RequireAuth — route guard. Redirects to /login when unauthenticated, and to
// /access-denied when the route's module is not viewable by the current user.
export default function RequireAuth({ module, children }) {
  const { isAuthenticated, booting, canViewModule } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();

  if (booting) return <Spinner label={`Starting ${settings.siteTitle}…`} />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (module && !canViewModule(module)) return <Navigate to="/access-denied" replace state={{ module }} />;
  return children;
}
