import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLE_LABELS, homeFor } from '../../utils/constants.js';
import NotificationBell from './NotificationBell.jsx';

const LINKS = {
  student: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/complaints/new', label: 'New complaint' },
  ],
  supervisor: [
    { to: '/staff', label: 'Complaints' },
    { to: '/staff/alerts', label: 'Alerts' },
  ],
  worker: [{ to: '/worker', label: 'My jobs' }],
  admin: [
    { to: '/admin', label: 'Analytics', end: true },
    { to: '/staff', label: 'Complaints' },
    { to: '/staff/alerts', label: 'Alerts' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/locations', label: 'Locations' },
    { to: '/admin/mappings', label: 'Routing' },
    { to: '/admin/qr', label: 'QR codes' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user) return null;

  const links = LINKS[user.role] || [];
  const linkClass = ({ isActive }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`;

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-[900] bg-brand-700 text-white shadow">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to={homeFor(user.role)} className="flex items-center gap-2 font-semibold">
          <img src="/favicon.svg" alt="" className="h-7 w-7 rounded" />
          <span className="hidden sm:inline">IITR Complaint Portal</span>
          <span className="sm:hidden">IITR CP</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 xl:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end ?? true} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <div className="hidden text-right text-xs leading-tight sm:block">
            <div className="font-medium">{user.name}</div>
            <div className="text-white/70">{ROLE_LABELS[user.role]}</div>
          </div>
          <button onClick={onLogout} className="hidden rounded-md px-3 py-1.5 text-sm text-white/90 hover:bg-white/10 xl:block">
            Log out
          </button>
          <button
            className="rounded-md p-2 hover:bg-white/10 xl:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 xl:hidden" onClick={() => setMenuOpen(false)}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end ?? true} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          <button onClick={onLogout} className="rounded-md px-3 py-1.5 text-left text-sm text-white/80 hover:bg-white/10">
            Log out ({user.name})
          </button>
        </nav>
      )}
    </header>
  );
}
