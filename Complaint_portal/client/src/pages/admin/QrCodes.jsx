import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { mapApi } from '../../api/map.api.js';
import { useFetch } from '../../hooks/useFetch.js';
import Loader from '../../components/common/Loader.jsx';

const BASE_KEY = 'iitr_qr_base_url';

function loadBase() {
  try {
    return localStorage.getItem(BASE_KEY) || window.location.origin;
  } catch {
    return window.location.origin;
  }
}

/** Scanning this link opens the complaint form with the building already chosen. */
export const reportUrl = (base, locationId) => `${base.replace(/\/+$/, '')}/report?location=${locationId}`;

function QrCard({ location, base }) {
  const [src, setSrc] = useState('');
  const url = reportUrl(base, location._id);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#5f0d0f' } })
      .then(setSrc)
      .catch(() => setSrc(''));
  }, [url]);

  const fileName = `QR - ${location.name.replace(/[\\/:*?"<>|]/g, '')}.png`;

  return (
    <div className="qr-card card flex flex-col items-center p-4 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">IIT Roorkee · Complaint Portal</div>
      {src ? <img src={src} alt={`QR code for ${location.name}`} className="my-2 h-44 w-44" /> : <div className="my-2 h-44 w-44 animate-pulse bg-slate-100" />}
      <div className="font-semibold leading-tight">{location.name}</div>
      <div className="text-xs text-slate-500">{location.zone?.name}</div>
      <div className="mt-1 text-sm">📱 Scan to report a problem here</div>
      <a href={src} download={fileName} className="btn-secondary no-print mt-3 px-3 py-1 text-xs">
        Download PNG
      </a>
    </div>
  );
}

/**
 * One QR code per building on the map. Print them (or download one) and stick them
 * at the entrance: scanning opens the complaint form with that building filled in.
 */
export default function QrCodes() {
  const { data: locations, loading } = useFetch(() => mapApi.locations().then((r) => r.items), []);
  const [base, setBase] = useState(loadBase);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');

  const saveBase = (value) => {
    setBase(value);
    try {
      localStorage.setItem(BASE_KEY, value);
    } catch {
      // not saved; the field just resets next visit
    }
  };

  const types = useMemo(() => [...new Set((locations || []).map((l) => l.type))].sort(), [locations]);
  const visible = (locations || []).filter(
    (l) => l.name.toLowerCase().includes(q.toLowerCase()) && (!type || l.type === type)
  );
  const isLocalhost = /localhost|127\.0\.0\.1/.test(base);

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">QR codes</h1>
          <p className="text-sm text-slate-500">
            One code per building. Print and put them at entrances, washrooms and corridors: scanning opens the
            complaint form with the building already selected.
          </p>
        </div>
        <button className="btn-primary" onClick={() => window.print()}>
          🖨️ Print {visible.length} code{visible.length === 1 ? '' : 's'}
        </button>
      </div>

      <div className="no-print card space-y-3 p-4">
        <label className="block">
          <span className="label">Website address used in the codes</span>
          <input className="input font-mono" value={base} onChange={(e) => saveBase(e.target.value)} />
        </label>
        {isLocalhost && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <b>localhost only works on this computer.</b> Before printing, change this to the deployed site address
            (e.g. https://complaints.iitr.ac.in), or to this laptop’s Wi-Fi IP (e.g. http://192.168.1.5:5173) to test with a
            phone on the same network.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <input className="input w-full sm:w-64" placeholder="Filter buildings…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter" />
          <select className="input w-auto capitalize" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && !locations && <Loader />}
      <div className="qr-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((l) => (
          <QrCard key={l._id} location={l} base={base} />
        ))}
      </div>
    </div>
  );
}
