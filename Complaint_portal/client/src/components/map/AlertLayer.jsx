import { Fragment } from 'react';
import { Circle, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from '../../lib/leaflet.js';
import { ALERT_TYPE, SEVERITY } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/formatters.js';

const iconCache = new Map();
function emojiIcon(emoji, color) {
  const key = `${emoji}-${color}`;
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: '',
        html: `<div style="background:#fff;border:2px solid ${color};border-radius:9999px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,.35)">${emoji}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
    );
  }
  return iconCache.get(key);
}

function AlertInfo({ alert }) {
  const upcoming = new Date(alert.startsAt) > new Date();
  return (
    <div className="max-w-56 text-xs">
      <div className="text-sm font-semibold">
        {ALERT_TYPE[alert.type]?.icon} {alert.title}
      </div>
      {alert.description && <div className="mt-0.5 whitespace-normal text-slate-600">{alert.description}</div>}
      <div className="mt-1 text-slate-500">
        {upcoming ? `From ${formatDateTime(alert.startsAt)} · ` : ''}Until {formatDateTime(alert.endsAt)}
      </div>
    </div>
  );
}

/** Draws campus alerts: a pin, a dashed road line or a shaded area, each with an emoji marker. */
export default function AlertLayer({ alerts = [], draft = false }) {
  return alerts.map((alert, i) => {
    if (!alert.points?.length) return null;
    const color = SEVERITY[alert.severity]?.color || '#dc2626';
    const upcoming = new Date(alert.startsAt) > new Date();
    const icon = emojiIcon(ALERT_TYPE[alert.type]?.icon || '📢', color);
    const latlngs = alert.points.map((p) => [p.lat, p.lng]);
    const key = alert._id || `draft-${i}`;
    // Upcoming alerts are drawn fainter
    const style = { color, weight: 5, opacity: upcoming ? 0.45 : 0.9, dashArray: '10 8', fillOpacity: upcoming ? 0.1 : 0.2 };
    const tooltip = !draft && (
      <Tooltip direction="top" offset={[0, -12]}>
        <AlertInfo alert={alert} />
      </Tooltip>
    );

    // Put the emoji in the middle of a road
    const mid = latlngs[Math.floor((latlngs.length - 1) / 2)];
    const iconAt =
      alert.shape === 'line' && latlngs.length > 1
        ? [(mid[0] + latlngs[Math.ceil((latlngs.length - 1) / 2)][0]) / 2, (mid[1] + latlngs[Math.ceil((latlngs.length - 1) / 2)][1]) / 2]
        : latlngs[0];

    return (
      <Fragment key={key}>
        {alert.shape === 'line' && latlngs.length > 1 && <Polyline positions={latlngs} pathOptions={style}>{tooltip}</Polyline>}
        {alert.shape === 'area' && alert.radius && (
          <Circle center={latlngs[0]} radius={alert.radius} pathOptions={{ ...style, weight: 2 }}>
            {tooltip}
          </Circle>
        )}
        <Marker position={iconAt} icon={icon} interactive={!draft}>
          {tooltip}
        </Marker>
        {/* In draft mode show each clicked point of a road */}
        {draft && alert.shape === 'line' && latlngs.map((p, j) => <Circle key={j} center={p} radius={4} pathOptions={{ color, weight: 2, fillOpacity: 1 }} />)}
      </Fragment>
    );
  });
}
