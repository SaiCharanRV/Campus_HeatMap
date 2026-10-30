import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api.js';
import { errorMessage } from '../../api/axios.js';
import Field from '../../components/common/Field.jsx';
import Button from '../../components/common/Button.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authApi.forgotPassword(email.trim().toLowerCase());
      toast.success(res.message);
      if (res.devOtp) {
        toast(`Dev mode: your OTP is ${res.devOtp}`, { icon: '🔑', duration: 10000 });
        setOtp(res.devOtp);
      }
      setStep('reset');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authApi.resetPassword({ email: email.trim().toLowerCase(), otp, password });
      toast.success(res.message);
      navigate('/login');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Reset password" subtitle={step === 'email' ? 'We’ll email you a one-time code.' : `Enter the code sent to ${email}.`}>
      {step === 'email' ? (
        <form onSubmit={sendOtp} className="space-y-4">
          <Field label="Email">
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-4">
          <Field label="OTP">
            <input
              className="input text-center font-mono text-lg tracking-[0.5em]"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
            />
          </Field>
          <Field label="New password" hint="Min 8 characters">
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="new-password" required />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            Update password
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="text-brand-700 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  );
}
