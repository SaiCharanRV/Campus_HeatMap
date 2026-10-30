import { useCallback, useState } from 'react';
import { mapApi } from '../../api/map.api.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useComplaintChanges } from '../../hooks/useComplaints.js';
import { useAlerts } from '../../hooks/useAlerts.js';
import { CATEGORIES } from '../../utils/constants.js';
import CampusMap from './CampusMap.jsx';
import LocationDrawer from './LocationDrawer.jsx';

/** Campus heatmap with category / status filters; double-click a location to open its complaints. */
export default function MapPanel({ defaultCategory = '', height = 440 }) {
  const [category, setCategory] = useState(defaultCategory);
  const [status, setStatus] = useState('open');
  const [selected, setSelected] = useState(null);

  const { data: locations } = useFetch(() => mapApi.locations().then((r) => r.items), []);
  const { data: points, reload } = useFetch(
    () => mapApi.heatmap({ category: category || undefined, status }).then((r) => r.items),
    [category, status]
  );
  useComplaintChanges(reload);
  const { alerts } = useAlerts();

  const totalOpen = (points || []).reduce((s, p) => s + p.count, 0);
  const close = useCallback(() => setSelected(null), []);

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 font-semibold">Campus map</h2>
        <button
          className={`chip ${!category ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white'}`}
          onClick={() => setCategory('')}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`chip ${category === c.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white'}`}
            onClick={() => setCategory(c.value)}
          >
            {c.icon} {c.label}
          </button>
        ))}
        <select className="input ml-auto w-auto py-1 text-xs" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="open">Open complaints</option>
          <option value="all">All time</option>
        </select>
      </div>
      <CampusMap
        locations={locations || []}
        points={points || []}
        alerts={alerts}
        onOpenLocation={setSelected}
        selectedId={selected?._id}
        height={height}
      />
      <p className="mt-2 text-xs text-slate-500">
        {totalOpen} complaint{totalOpen === 1 ? '' : 's'} shown
        {alerts.length > 0 && ` · ${alerts.length} campus alert${alerts.length === 1 ? '' : 's'} (dashed lines / emoji pins)`} · Red
        areas have the most complaints. Double-click a building (or tap it and choose “View complaints”) to see its
        complaints.
      </p>
      {selected && <LocationDrawer location={selected} initialCategory={category} onClose={close} />}
    </section>
  );
}
