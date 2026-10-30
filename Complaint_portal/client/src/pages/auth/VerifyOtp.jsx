import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api.js';
import { errorMessage } from '../../api/axios.js';
import { useAuth } from '../../hooks/useAuth.js';
import Field from '../../components/common/Field.jsx';
import Button from '../../components/common/Button.jsx';
import AuthLayout from './AuthLayout.jsx';

const RESEND_SECONDS = 60;

export default function VerifyOtp() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { completeAuth } = useAuth();
  const email = state?.email;

  const [form, setForm] = useState({
    otp: state?.devOtp || '',
    name: '',
    enrollmentNo: '',
    hostel: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!email) return <Navigate to="/register" replace />;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const resend = async () => {
    try {
      const res = await authApi.sendRegisterOtp(email);
      toast.success('A new OTP has been sent');
      if (res.devOtp) {
        toast(`Dev mode: your OTP is ${res.devOtp}`, { icon: '🔑', duration: 10000 });
        setForm((f) => ({ ...f, otp: res.devOtp }));
      }
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const { confirm, ...body } = form;
      const res = await authApi.verifyRegister({ ...body, email });
      completeAuth(res);
      toast.success('Account created!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Verify your email" subtitle={`Enter the code sent to ${email} and finish your profile.`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="6-digit OTP">
          <div className="flex gap-2">
            <input
              className="input text-center font-mono text-lg tracking-[0.5em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={form.otp}
              onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, '') }))}
              required
            />
            <button type="button" onClick={resend} disabled={cooldown > 0} className="btn-secondary shrink-0 px-3">
              {cooldown > 0 ? `Resend ${cooldown}s` : 'Resend'}
            </button>
          </div>
        </Field>
        <Field label="Full name">
          <input className="input" value={form.name} onChange={set('name')} autoComplete="name" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Enrollment no.">
            <input className="input" value={form.enrollmentNo} onChange={set('enrollmentNo')} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={set('phone')} inputMode="tel" autoComplete="tel" />
          </Field>
        </div>
        <Field label="Hostel (Bhawan)">
          <input className="input" value={form.hostel} onChange={set('hostel')} placeholder="e.g. Rajendra Bhawan" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" hint="Min 8 characters">
            <input className="input" type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Confirm">
            <input className="input" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" required />
          </Field>
        </div>
        <Button type="submit" loading={busy} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Wrong email?{' '}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          Start again
        </Link>
      </p>
    </AuthLayout>
  );
}
