import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { homeFor } from '../utils/constants.js';
import Loader from '../components/common/Loader.jsx';

/** Renders children only for a logged-in user whose role is in `roles` (any role if omitted). */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullPage />;
  // Keep the query string too, so a scanned QR link (/report?location=…) survives the login
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
