import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api.js';
import { errorMessage } from '../../api/axios.js';
import Field from '../../components/common/Field.jsx';
import Button from '../../components/common/Button.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authApi.sendRegisterOtp(email.trim().toLowerCase());
      toast.success(res.message);
      if (res.devOtp) toast(`Dev mode: your OTP is ${res.devOtp}`, { icon: '🔑', duration: 10000 });
      navigate('/verify-otp', { state: { email: email.trim().toLowerCase(), devOtp: res.devOtp } });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create student account" subtitle="We’ll email a 6-digit code to verify your email.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field>
        <Button type="submit" loading={busy} className="w-full">
          Send OTP
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
