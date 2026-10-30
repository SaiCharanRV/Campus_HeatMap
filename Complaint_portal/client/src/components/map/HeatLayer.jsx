import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from '../../lib/leaflet.js';
import 'leaflet.heat';

// blue (few complaints) → yellow → red (many)
const GRADIENT = { 0.2: '#2563eb', 0.45: '#22d3ee', 0.65: '#facc15', 0.85: '#f97316', 1: '#dc2626' };

/** points: [[lat, lng, intensity], ...] */
export default function HeatLayer({ points, max = 1 }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return undefined;
    const layer = L.heatLayer(points, { radius: 38, blur: 28, maxZoom: 17, max, minOpacity: 0.35, gradient: GRADIENT });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, max]);

  return null;
}
