import { useEffect, useMemo, useRef } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from '../../lib/leaflet.js';
import HeatLayer from './HeatLayer.jsx';
import AlertLayer from './AlertLayer.jsx';
import { CAMPUS_BOUNDS, CAMPUS_CENTER } from '../../utils/constants.js';
import { latLng } from '../../utils/formatters.js';

/** Marker colour by open complaint count: green < 3, orange 3–10, red > 10 */
export function countColor(count) {
  if (!count) return '#94a3b8';
  if (count < 3) return '#16a34a';
  if (count <= 10) return '#ea580c';
  return '#dc2626';
}

/** Zooms the map to fit every location once they have loaded. */
function FitToLocations({ locations }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current) return;
    const positions = locations.map(latLng).filter(Boolean);
    if (positions.length < 2) return;
    map.fitBounds(positions, { padding: [24, 24] });
    fitted.current = true;
  }, [map, locations]);
  return null;
}

function ClickToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

/**
 * IIT Roorkee map with a complaint heatmap and one marker per location.
 * Double-click a marker (or use its popup button) to open that location's complaints.
 *
 * props:
 *  locations   — all locations
 *  points      — heatmap items from /map/heatmap ({ locationId, lat, lng, count, intensity, byCategory })
 *  onOpenLocation(location) — called on double-click / "View complaints"
 *  onPick([lat,lng]) + picked — admin mode: click the map to choose coordinates
 *  alerts      — campus alerts to draw; draftAlert — an alert being drawn in the editor
 */
export default function CampusMap({
  locations = [],
  points = [],
  alerts = [],
  draftAlert,
  onOpenLocation,
  selectedId,
  height = 440,
  showHeat = true,
  onPick,
  picked,
}) {
  const pointById = useMemo(() => new Map(points.map((p) => [String(p.locationId), p])), [points]);
  const heatPoints = useMemo(() => points.map((p) => [p.lat, p.lng, p.intensity]), [points]);
  const maxIntensity = useMemo(
    () => Math.max(1, ...points.map((p) => p.intensity)) * 0.5,
    [points]
  );

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
      <MapContainer
        center={CAMPUS_CENTER}
        zoom={16}
        minZoom={15}
        maxZoom={19}
        maxBounds={CAMPUS_BOUNDS}
        maxBoundsViscosity={0.8}
        doubleClickZoom={false}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitToLocations locations={locations} />
        {showHeat && <HeatLayer points={heatPoints} max={maxIntensity} />}

        {locations.map((loc) => {
          const pos = latLng(loc);
          if (!pos) return null;
          const p = pointById.get(String(loc._id));
          const count = p?.count || 0;
          const selected = selectedId === loc._id;
          return (
            <CircleMarker
              key={loc._id}
              center={pos}
              radius={7 + Math.min(count, 12)}
              pathOptions={{
                color: selected ? '#111827' : '#ffffff',
                weight: selected ? 3 : 1.5,
                fillColor: countColor(count),
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                dblclick: (e) => {
                  L.DomEvent.stop(e);
                  onOpenLocation?.(loc);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <b>{loc.name}</b>
                <br />
                {count} open complaint{count === 1 ? '' : 's'}
                {onOpenLocation && (
                  <>
                    <br />
                    <span className="text-slate-500">Double-click to view</span>
                  </>
                )}
              </Tooltip>
              {onOpenLocation && (
                <Popup>
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">{loc.name}</div>
                    <div className="text-slate-500">
                      {loc.zone?.name} · {count} open
                    </div>
                    {p?.byCategory && (
                      <div className="text-xs text-slate-600">
                        {Object.entries(p.byCategory)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')}
                      </div>
                    )}
                    <button className="btn-primary mt-1 w-full px-2 py-1 text-xs" onClick={() => onOpenLocation(loc)}>
                      View complaints
                    </button>
                  </div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}

        <AlertLayer alerts={alerts} />
        {draftAlert && <AlertLayer alerts={[draftAlert]} draft />}

        {onPick && <ClickToPick onPick={onPick} />}
        {picked && (
          <CircleMarker center={picked} radius={9} pathOptions={{ color: '#111827', weight: 3, fillColor: '#facc15', fillOpacity: 1 }} />
        )}
      </MapContainer>

      {showHeat && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-lg bg-white/90 px-3 py-2 text-xs shadow">
          <div className="mb-1 font-medium text-slate-700">Open complaints</div>
          <div className="flex items-center gap-3">
            {[
              ['#16a34a', '< 3'],
              ['#ea580c', '3–10'],
              ['#dc2626', '> 10'],
            ].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
