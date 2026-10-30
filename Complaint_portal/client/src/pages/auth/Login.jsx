import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import { homeFor } from '../../utils/constants.js';
import Field from '../../components/common/Field.jsx';
import Button from '../../components/common/Button.jsx';
import AuthLayout from './AuthLayout.jsx';

const DEMO = {
  student: [['student@iitr.ac.in', 'Student@123']],
  staff: [
    ['sup.a.water@iitr.ac.in', 'Staff@123'],
    ['worker.a.water1@iitr.ac.in', 'Staff@123'],
    ['admin@iitr.ac.in', 'Admin@123'],
  ],
};

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const me = await login(email.trim(), password, role);
      toast.success(`Welcome, ${me.name.split(' ')[0]}`);
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : homeFor(me.role), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Log in" subtitle="Report and track campus issues">
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium" role="tablist">
        {['student', 'staff'].map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={role === r}
            onClick={() => setRole(r)}
            className={`rounded-md py-2 transition ${role === r ? 'bg-white text-brand-700 shadow' : 'text-slate-500'}`}
          >
            {r === 'student' ? 'Student' : 'Staff'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={role === 'student' ? 'you@example.com' : 'staff email'}
            required
          />
        </Field>
        <Field label="Password">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <div className="flex justify-end text-sm">
          <Link to="/forgot-password" className="text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={busy} className="w-full">
          Log in as {role === 'student' ? 'student' : 'staff'}
        </Button>
      </form>

      {role === 'student' ? (
        <p className="mt-6 text-center text-sm text-slate-600">
          New here?{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            Create a student account
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-center text-xs text-slate-500">Staff accounts are created by the portal admin.</p>
      )}

      {import.meta.env.DEV && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
          <div className="mb-1 font-medium">Demo accounts (dev only)</div>
          {DEMO[role].map(([em, pw]) => (
            <button
              key={em}
              type="button"
              className="block hover:text-brand-700"
              onClick={() => {
                setEmail(em);
                setPassword(pw);
              }}
            >
              {em} / {pw}
            </button>
          ))}
        </div>
      )}
    </AuthLayout>
  );
}
