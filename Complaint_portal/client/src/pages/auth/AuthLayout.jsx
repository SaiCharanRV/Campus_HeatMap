/** Centered card used by login, register, OTP and password reset pages. */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-4 py-10">
      <div className="mb-6 flex items-center gap-3 text-white">
        <img src="/favicon.svg" alt="" className="h-10 w-10 rounded-lg ring-2 ring-white/30" />
        <div>
          <div className="text-lg font-semibold leading-tight">IIT Roorkee</div>
          <div className="text-sm text-white/80">Campus Complaint Portal</div>
        </div>
      </div>
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
