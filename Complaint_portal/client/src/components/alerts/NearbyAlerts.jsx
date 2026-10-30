import { distanceToAlert, useAlerts } from '../../hooks/useAlerts.js';
import { ALERT_TYPE } from '../../utils/constants.js';
import { formatDateTime, latLng } from '../../utils/formatters.js';

const NEAR_METRES = 150;

/**
 * On the complaint form: "There's already a planned water shutdown here until 6 pm".
 * Shows current alerts linked to, or within ~150 m of, the chosen location.
 */
export default function NearbyAlerts({ location }) {
  const { active } = useAlerts();
  const pos = latLng(location);
  if (!pos) return null;
  const point = { lat: pos[0], lng: pos[1] };

  const nearby = active.filter(
    (a) => a.location?._id === location._id || distanceToAlert(point, a) <= NEAR_METRES
  );
  if (!nearby.length) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <p className="font-medium">Heads up: there’s an active notice near {location.name}</p>
      <ul className="mt-2 space-y-1">
        {nearby.map((a) => (
          <li key={a._id}>
            {ALERT_TYPE[a.type]?.icon} <b>{a.title}</b> · until {formatDateTime(a.endsAt)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs opacity-80">If your problem is caused by this, it’s already known and being handled.</p>
    </div>
  );
}
