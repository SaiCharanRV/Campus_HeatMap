import { useNavigate, useSearchParams } from 'react-router-dom';
import { mapApi } from '../../api/map.api.js';
import { useFetch } from '../../hooks/useFetch.js';
import ComplaintForm from '../../components/complaint/ComplaintForm.jsx';
import Loader from '../../components/common/Loader.jsx';

export default function NewComplaint() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: locations, loading, error } = useFetch(() => mapApi.locations().then((r) => r.items), []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Report an issue</h1>
        <p className="text-sm text-slate-500">
          It goes straight to the supervisor for that area and department. You’ll get updates at every step.
        </p>
      </div>
      <div className="card p-5 sm:p-6">
        {loading && <Loader />}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {locations && (
          <ComplaintForm
            // re-create the form when the link's ?location / ?category changes
            key={params.toString()}
            locations={locations}
            initialLocation={params.get('location') || ''}
            initialCategory={params.get('category') || ''}
            onCreated={(c) => navigate(`/complaints/${c._id}`, { replace: true })}
          />
        )}
      </div>
    </div>
  );
}
