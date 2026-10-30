import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Target of the printed QR codes: /report?location=<id>.
 * Students go straight to the complaint form for that building; staff see its complaints.
 * (Logged-out visitors are sent to login first by ProtectedRoute and come back here.)
 */
export default function ReportRedirect() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const location = params.get('location');

  if (!location) return <Navigate to="/" replace />;
  if (user.role === 'student') return <Navigate to={`/complaints/new?location=${location}`} replace />;
  return <Navigate to={`/location/${location}`} replace />;
}
