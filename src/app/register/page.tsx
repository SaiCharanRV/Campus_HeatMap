"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, KeyRound, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  
  // Allow @iitr.ac.in or any subdomain like @ece.iitr.ac.in
  const isEmailValid = email === "" || email.endsWith("@iitr.ac.in") || email.endsWith(".iitr.ac.in");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep("otp");
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/login?registered=true");
      } else {
        setError(data.message || "Invalid OTP");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side: Brand Visual (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 relative p-12 flex-col justify-between overflow-hidden">
        {/* Abstract Geometric Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]"></div>
        <div className="absolute top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-overlay filter blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-overlay filter blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white mb-16">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-wide">IIT Roorkee</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Join the <br />
            <span className="text-blue-300">Campus Network</span>
          </h1>
          <p className="text-indigo-200 text-lg max-w-md leading-relaxed">
            Create your official account to access all university digital services seamlessly.
          </p>
        </div>
        
        <div className="relative z-10 flex items-center justify-between text-indigo-300 text-sm font-medium">
          <p>&copy; {new Date().getFullYear()} IIT Roorkee. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-sm">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center justify-center gap-2 text-indigo-900 mb-8">
            <GraduationCap className="h-8 w-8" />
            <span className="font-bold text-xl tracking-wide">IIT Roorkee</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Create Account</h2>
            <p className="text-slate-500 text-sm">Please fill in your details to get started.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}

          {step === "details" ? (
            <form onSubmit={handleRegister} className="space-y-6">
              {/* Segmented Control for Role */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRole("Student")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    role === "Student" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("Staff")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    role === "Staff" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Staff
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@iitr.ac.in"
                      className={`w-full pl-10 pr-4 py-2.5 bg-white border ${isEmailValid ? 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500' : 'border-red-300 focus:border-red-500 focus:ring-red-500'} rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 shadow-sm`}
                    />
                  </div>
                  {!isEmailValid && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">Please use your official @iitr.ac.in or departmental email.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isEmailValid}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <KeyRound className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-slate-600 text-sm">
                  We've sent a 6-digit code to<br />
                  <span className="text-slate-900 font-medium">{email}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 text-center">Verification Code</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full text-center tracking-[0.75em] text-2xl py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Account"}
              </button>

              <button
                type="button"
                onClick={() => setStep("details")}
                className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors duration-200"
              >
                Back to registration
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
