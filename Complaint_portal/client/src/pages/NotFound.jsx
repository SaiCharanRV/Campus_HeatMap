import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { homeFor } from '../utils/constants.js';
import EmptyState from '../components/common/EmptyState.jsx';

export default function NotFound() {
  const { user } = useAuth();
  return (
    <EmptyState icon="🧭" title="Page not found">
      <Link to={homeFor(user?.role)} className="text-brand-700 hover:underline">
        Go to your dashboard
      </Link>
    </EmptyState>
  );
}
