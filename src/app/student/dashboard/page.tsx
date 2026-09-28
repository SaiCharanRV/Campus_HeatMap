import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { LogOut, User, GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
          <GraduationCap className="h-6 w-6" />
          <span>Student Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-600 hidden sm:block">
            {session.user?.email}
          </div>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 md:p-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, Student!</h1>
          <p className="text-slate-500">Manage your courses, view grades, and access campus resources.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <User className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Profile</h3>
            <p className="text-slate-500 text-sm">View and edit your student profile details.</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Academics</h3>
            <p className="text-slate-500 text-sm">Check your grades, attendance, and timetable.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
