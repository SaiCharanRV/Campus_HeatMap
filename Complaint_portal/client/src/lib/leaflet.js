// leaflet.heat expects a global `L`, so expose it before that plugin is imported.
import L from 'leaflet';

window.L = L;

export default L;
