import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen animated-gradient-bg flex items-center justify-center p-4">
      <div className="glass-panel max-w-2xl text-center rounded-3xl p-12 relative overflow-hidden">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
          IIT Roorkee Campus Portal
        </h1>
        <p className="text-lg text-gray-200 mb-10 max-w-lg mx-auto">
          Secure, unified access for Students and Staff. Sign in or register using your official @iitr.ac.in email address.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-indigo-900 hover:bg-gray-100 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
