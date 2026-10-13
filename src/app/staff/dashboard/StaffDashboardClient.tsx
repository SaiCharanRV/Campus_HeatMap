"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LogOut,
  Briefcase,
  LayoutDashboard,
  Bell,
  Settings,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  MapPin,
  Search,
  ChevronDown,
  ClipboardList,
  TrendingUp,
  Inbox,
  RefreshCw,
  Filter,
  Building2,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type Complaint = {
  id: number;
  issueType: string;
  description: string;
  date: string;
  status: string;
  severity?: string;
  location?: string;
};

interface Props {
  name: string | null;
  email: string | null;
  department: string | null;
  zone: string | null;
}

const STATUS_OPTIONS = ["Pending", "In Progress", "Resolved"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "Pending":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <AlertTriangle className="w-3 h-3" /> Pending
        </span>
      );
    case "In Progress":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      );
    case "Resolved":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle className="w-3 h-3" /> Resolved
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

function getSeverityBadge(severity?: string) {
  switch (severity) {
    case "Low":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
          Low
        </span>
      );
    case "Medium":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
          Medium
        </span>
      );
    case "High":
    case "Critical":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          {severity}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
          {severity || "N/A"}
        </span>
      );
  }
}

function getDeptColor(dept: string | null) {
  const map: Record<string, { bg: string; text: string }> = {
    Water: { bg: "bg-blue-600", text: "text-white" },
    Electrical: { bg: "bg-amber-500", text: "text-white" },
    WiFi: { bg: "bg-violet-600", text: "text-white" },
    Cleaning: { bg: "bg-emerald-600", text: "text-white" },
    Infrastructure: { bg: "bg-rose-600", text: "text-white" },
  };
  return (dept && map[dept]) ? map[dept] : { bg: "bg-slate-600", text: "text-white" };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StaffDashboardClient({ name, email, department, zone }: Props) {
  const displayName = name ?? email ?? "Staff";
  const displayDept = department ?? "All Departments";
  const displayZone = zone ?? "—";
  const deptColors = getDeptColor(department);
  const initials = (name ?? email ?? "S").charAt(0).toUpperCase();

  // ── State ──
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    const saved = localStorage.getItem("userComplaints");
    if (saved) {
      try {
        setAllComplaints(JSON.parse(saved));
      } catch {
        setAllComplaints([]);
      }
    }
    setIsLoaded(true);
  }, []);

  // ── Write back to localStorage on every change ──
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("userComplaints", JSON.stringify(allComplaints));
    }
  }, [allComplaints, isLoaded]);

  // ── Department filter (dynamic from session) ──
  const deptComplaints = department
    ? allComplaints.filter((c) => c.issueType === department)
    : allComplaints; // if no department set, show all (fallback)

  // ── Secondary filters ──
  const filteredComplaints = deptComplaints.filter((c) => {
    if (filterStatus !== "All" && c.status !== filterStatus) return false;
    if (filterSeverity !== "All" && c.severity !== filterSeverity) return false;
    if (
      searchQuery &&
      !c.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(c.location ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // ── Metrics ──
  const countPending = deptComplaints.filter((c) => c.status === "Pending").length;
  const countInProgress = deptComplaints.filter((c) => c.status === "In Progress").length;
  const countResolved = deptComplaints.filter((c) => c.status === "Resolved").length;

  // ── Status change → immediately persist to localStorage ──
  const handleStatusChange = useCallback((id: number, newStatus: string) => {
    setAllComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    showToast(`Status updated to "${newStatus}"`);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRefresh = () => {
    const saved = localStorage.getItem("userComplaints");
    if (saved) {
      try {
        setAllComplaints(JSON.parse(saved));
        showToast("Refreshed latest complaints.");
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-slate-200 md:min-h-screen flex flex-col sticky top-0 z-20 shadow-sm">
        <div className="p-5 md:p-6 flex justify-between items-center md:block">
          <div className="flex items-center gap-2.5 text-purple-700 font-bold text-xl md:mb-10">
            <Briefcase className="h-6 w-6" />
            <span>Staff Portal</span>
          </div>
        </div>

        {/* Department + Zone badge */}
        <div className="hidden md:flex flex-col px-5 mb-6 gap-2">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${deptColors.bg} ${deptColors.text} w-full`}>
            <ClipboardList className="h-4 w-4 opacity-80" />
            <span className="font-semibold text-sm">{displayDept}</span>
          </div>
          {zone && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium w-full">
              <MapPin className="h-4 w-4 opacity-70" />
              <span>{displayZone}</span>
            </div>
          )}
        </div>

        <nav className="hidden md:flex flex-col gap-1 px-4 flex-1">
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 bg-purple-50 text-purple-700 rounded-lg font-medium transition-colors">
            <LayoutDashboard className="h-5 w-5" /> Dashboard
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Inbox className="h-5 w-5" /> Issue Queue
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Bell className="h-5 w-5" /> Notifications
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <TrendingUp className="h-5 w-5" /> Analytics
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Settings className="h-5 w-5" /> Settings
          </Link>
        </nav>

        {/* Profile footer in sidebar */}
        <div className="hidden md:flex items-center gap-3 m-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className={`w-9 h-9 rounded-full ${deptColors.bg} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-sm font-bold ${deptColors.text}`}>{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{email ?? ""}</p>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-6 md:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              Welcome back, <span className="text-purple-700">{displayName}</span>!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {displayDept}
              {zone ? ` · ${displayZone}` : ""}
              {" · Staff Portal"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              title="Refresh complaints"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{displayName}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-30">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                    <p className="text-xs text-slate-500 truncate">{email}</p>
                    {department && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {department}
                        {zone ? ` · ${zone}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="p-1">
                    <Link
                      href="/api/auth/signout"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* ── Metric cards ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-0.5">Pending</p>
                <p className="text-3xl font-bold text-amber-600">{countPending}</p>
                <p className="text-xs text-slate-400 mt-0.5">{displayDept} issues</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-0.5">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{countInProgress}</p>
                <p className="text-xs text-slate-400 mt-0.5">{displayDept} issues</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-0.5">Resolved</p>
                <p className="text-3xl font-bold text-emerald-600">{countResolved}</p>
                <p className="text-xs text-slate-400 mt-0.5">{displayDept} issues</p>
              </div>
            </div>
          </div>

          {/* ── Issues table ─────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Table header + filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {displayDept} — Active Issues
                  {zone && <span className="ml-2 text-sm font-normal text-slate-400">({displayZone})</span>}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {deptComplaints.length} total ·{" "}
                  <span className="text-purple-600 font-medium">{filteredComplaints.length} shown</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search description / location…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Status filter */}
                <div className="relative">
                  <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none bg-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                {/* Severity filter */}
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="All">All Severities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold">Issue</th>
                    <th className="px-6 py-4 font-semibold">Description</th>
                    <th className="px-6 py-4 font-semibold">Location</th>
                    <th className="px-6 py-4 font-semibold">Reported</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                            <Inbox className="h-7 w-7 text-slate-400" />
                          </div>
                          <p className="text-base font-semibold text-slate-700">
                            No {displayDept} issues found
                          </p>
                          <p className="text-sm text-slate-400 max-w-xs">
                            {deptComplaints.length === 0
                              ? "Students haven't reported any issues in this department yet."
                              : "Try adjusting your filters."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-semibold text-slate-900 text-sm">{complaint.issueType}</span>
                            {getSeverityBadge(complaint.severity)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 max-w-xs line-clamp-2">
                            {complaint.description || "—"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500 flex items-center gap-1 whitespace-nowrap">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            {complaint.location || "Not specified"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {complaint.date}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(complaint.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative inline-block">
                            <select
                              value={complaint.status}
                              onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                              className={`
                                appearance-none pl-3 pr-8 py-2 text-sm font-medium rounded-lg border cursor-pointer
                                focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors
                                ${complaint.status === "Pending"
                                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                  : complaint.status === "In Progress"
                                  ? "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                }
                              `}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-60" />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer summary */}
            {filteredComplaints.length > 0 && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing {filteredComplaints.length} of {deptComplaints.length} {displayDept} issues
                </span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> {countPending} pending
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400" /> {countInProgress} in progress
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> {countResolved} resolved
                  </span>
                </span>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl">
          <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
