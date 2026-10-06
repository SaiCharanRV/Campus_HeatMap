"use client";

import { useState, useEffect } from "react";
import { LogOut, User, GraduationCap, AlertCircle, MapPin, X, Clock, CheckCircle, AlertTriangle, LayoutDashboard, FileText, Bell, Map, Search, ChevronRight, Activity, ThumbsUp } from "lucide-react";
import Link from "next/link";

interface DashboardClientProps {
  user?: {
    email?: string | null;
    name?: string | null;
  };
}

type Complaint = {
  id: number;
  issueType: string;
  description: string;
  date: string;
  status: string;
  severity?: string;
  location?: string;
};

// Popular Issue Type
type PopularIssue = {
  id: number;
  title: string;
  location: string;
  affectedCount: number;
  confirmed: boolean;
};

const MOCK_POPULAR_ISSUES: PopularIssue[] = [
  { id: 1, title: "Water leakage", location: "Rajendra Bhawan", affectedCount: 12, confirmed: false },
  { id: 2, title: "Streetlight not working", location: "Library Road", affectedCount: 8, confirmed: false },
  { id: 3, title: "Slow Wi-Fi connection", location: "LHC Room 104", affectedCount: 24, confirmed: false },
];

const MOCK_ACTIVITIES = [
  { id: 1, text: "Wi-Fi issue at Lecture Hall Complex resolved", time: "2 hours ago", type: "success" },
  { id: 2, text: "New high-priority water issue reported at Rajendra Bhawan", time: "5 hours ago", type: "warning" },
  { id: 3, text: "Scheduled maintenance for Electricity in Cautley Bhawan", time: "1 day ago", type: "info" },
];

export default function DashboardClient({ user }: DashboardClientProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Form state
  const [issueType, setIssueType] = useState("Water");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Low");
  const [photo, setPhoto] = useState<File | null>(null);

  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Disputed complaints state
  const [disputedComplaints, setDisputedComplaints] = useState<number[]>([]);

  // Popular issues state
  const [popularIssues, setPopularIssues] = useState<PopularIssue[]>(MOCK_POPULAR_ISSUES);

  // Filters for history
  const [historyCategory, setHistoryCategory] = useState("All");
  const [historyStatus, setHistoryStatus] = useState("All");
  const [historySearch, setHistorySearch] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("userComplaints");
    if (saved) {
      try {
        setComplaints(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse complaints from localStorage", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when complaints change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("userComplaints", JSON.stringify(complaints));
    }
  }, [complaints, isLoaded]);

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (error) => {
          alert("Unable to retrieve your location");
        }
      );
    } else {
      alert("Geolocation not supported");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newComplaint: Complaint = {
      id: Date.now(),
      issueType,
      description,
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: "Pending",
      severity,
      location
    };
    setComplaints([newComplaint, ...complaints]);
    
    setModalOpen(false);
    // Reset form
    setDescription("");
    setLocation("");
    setPhoto(null);
    setIssueType("Water");
    setSeverity("Low");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3" /> Pending</span>;
      case "In Progress":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3" /> In Progress</span>;
      case "Resolved":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case "Low":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">Low</span>;
      case "Medium":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">Medium</span>;
      case "High":
      case "Critical":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">{severity}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">{severity || "N/A"}</span>;
    }
  };

  const activeIssues = complaints.filter(c => c.status !== "Resolved");
  
  const filteredHistory = complaints.filter(c => {
    if (historyCategory !== "All" && c.issueType !== historyCategory) return false;
    if (historyStatus !== "All" && c.status !== historyStatus) return false;
    if (historySearch && !c.description.toLowerCase().includes(historySearch.toLowerCase())) return false;
    return true;
  });

  const confirmPopularIssue = (id: number) => {
    setPopularIssues(issues => issues.map(issue => {
      if (issue.id === id) {
        return { ...issue, affectedCount: issue.affectedCount + 1, confirmed: true };
      }
      return issue;
    }));
  };

  const handleDispute = (id: number) => {
    setDisputedComplaints([...disputedComplaints, id]);
  };

  const totalReports = complaints.length;
  const totalPending = complaints.filter(c => c.status === "Pending").length;
  const totalResolved = complaints.filter(c => c.status === "Resolved").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Top Nav / Sidebar for Mobile & Desktop */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-slate-200 md:min-h-screen flex flex-col sticky top-0 z-20 shadow-sm md:shadow-none">
        <div className="p-4 md:p-6 flex justify-between items-center md:block">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl md:mb-8">
            <GraduationCap className="h-6 w-6" />
            <span>Campus Port</span>
          </div>
        </div>
        
        <nav className="hidden md:flex flex-col gap-1 px-4 flex-1">
          <Link href="#" className="flex items-center gap-3 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium transition-colors">
            <LayoutDashboard className="h-5 w-5" /> Dashboard
          </Link>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors w-full text-left">
            <AlertCircle className="h-5 w-5" /> Report Issue
          </button>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Map className="h-5 w-5" /> Campus Issues
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <FileText className="h-5 w-5" /> My Reports
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            <Bell className="h-5 w-5" /> Notifications
          </Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors mt-auto mb-4">
            <User className="h-5 w-5" /> Profile
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 md:hidden shadow-sm">
          <span className="font-semibold text-slate-800">Dashboard</span>
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 focus:outline-none"
            >
              <User className="h-4 w-4 text-slate-600" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-20">
                <div className="p-1">
                  <Link href="/api/auth/signout" className="flex items-center w-full gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 py-4 justify-end items-center sticky top-0 z-10">
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <User className="h-5 w-5 text-slate-600" />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-20">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">{user?.email || "Student"}</p>
                </div>
                <div className="p-1">
                  <Link href="/api/auth/signout" className="flex items-center w-full gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* Top Dashboard Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, Student!</h1>
              <p className="text-slate-500">Manage your campus issues and stay updated on community reports.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => setModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-colors font-medium shadow-sm"
              >
                <AlertCircle className="h-5 w-5" />
                Report an Issue
              </button>
              <Link 
                href="/student/map"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl transition-colors font-medium shadow-sm"
              >
                <MapPin className="h-5 w-5 text-indigo-600" />
                View Campus Map
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500 mb-1">My Reports</p>
              <p className="text-3xl font-bold text-slate-800">{totalReports}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{totalPending}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-sm font-medium text-slate-500 mb-1">Resolved</p>
              <p className="text-3xl font-bold text-green-600">{totalResolved}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Main Content Area */}
            <div className="xl:col-span-2 space-y-8">
              
              {/* My Active Issues Section */}
              <section>
                <h2 className="text-xl font-bold mb-4 text-slate-800">My Active Issues</h2>
                {activeIssues.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                    <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">You have no active issues.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeIssues.map(issue => (
                      <div key={issue.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-slate-800">{issue.issueType}</h3>
                              {getSeverityBadge(issue.severity)}
                            </div>
                            <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {issue.location || "Location not specified"}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(issue.status)}
                            <p className="text-xs text-slate-400 mt-1">{issue.date}</p>
                          </div>
                        </div>
                        
                        {/* Progress Tracker */}
                        <div className="mt-6 px-2">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-500 relative">
                            {/* Line connecting steps */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
                            
                            {["Submitted", "Verified", "In Progress", "Resolved"].map((step) => {
                              const isPending = issue.status === "Pending";
                              const isInProgress = issue.status === "In Progress";
                              
                              let isCompleted = false;
                              let isCurrent = false;
                              
                              if (step === "Submitted") {
                                isCompleted = true;
                                isCurrent = isPending;
                              } else if (step === "Verified") {
                                isCompleted = isInProgress || issue.status === "Resolved";
                                isCurrent = false;
                              } else if (step === "In Progress") {
                                isCompleted = issue.status === "Resolved";
                                isCurrent = isInProgress;
                              } else if (step === "Resolved") {
                                isCompleted = issue.status === "Resolved";
                                isCurrent = issue.status === "Resolved";
                              }

                              return (
                                <div key={step} className="flex flex-col items-center gap-2 bg-white px-1">
                                  <div className={`w-4 h-4 rounded-full border-2 ${isCompleted || isCurrent ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}></div>
                                  <span className={isCurrent ? 'text-indigo-600 font-bold' : ''}>{step}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* My Complaint History Section */}
              <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h2 className="text-xl font-bold text-slate-800">My Complaint History</h2>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 min-w-[150px]">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Search..."
                        value={historySearch}
                        onChange={e => setHistorySearch(e.target.value)}
                        className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <select 
                      value={historyCategory}
                      onChange={e => setHistoryCategory(e.target.value)}
                      className="border border-slate-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="All">All Categories</option>
                      <option value="Water">Water</option>
                      <option value="Electricity">Electricity</option>
                      <option value="WiFi">WiFi</option>
                      <option value="Cleaning">Cleaning</option>
                      <option value="Infrastructure">Infrastructure</option>
                    </select>
                    <select 
                      value={historyStatus}
                      onChange={e => setHistoryStatus(e.target.value)}
                      className="border border-slate-200 rounded-lg text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                          <th className="px-6 py-4 font-medium">Issue Type</th>
                          <th className="px-6 py-4 font-medium">Description</th>
                          <th className="px-6 py-4 font-medium">Date & Time</th>
                          <th className="px-6 py-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredHistory.map((complaint) => (
                          <tr key={complaint.id} className="hover:bg-slate-50 transition-colors group relative">
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className="font-medium text-slate-900">{complaint.issueType}</span>
                                {getSeverityBadge(complaint.severity)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              <div className="max-w-xs">{complaint.description}</div>
                              {/* Resolution Confirmation UI underneath description if resolved */}
                              {complaint.status === "Resolved" && (
                                <div className="mt-3 text-sm bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                  {disputedComplaints.includes(complaint.id) ? (
                                    <span className="text-indigo-700 font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Thanks. This issue will be flagged for re-verification.</span>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      <span className="text-indigo-800 font-medium">Was this issue actually resolved?</span>
                                      <div className="flex gap-2">
                                        <button className="text-indigo-700 hover:text-indigo-900 font-medium bg-white px-3 py-1 rounded shadow-sm border border-indigo-200 transition-colors">Yes</button>
                                        <button 
                                          onClick={() => handleDispute(complaint.id)}
                                          className="text-red-700 hover:text-red-900 font-medium bg-white px-3 py-1 rounded shadow-sm border border-red-200 transition-colors"
                                        >
                                          No, still exists
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                              {complaint.date}
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(complaint.status)}
                            </td>
                          </tr>
                        ))}
                        {filteredHistory.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                              <div className="flex flex-col items-center justify-center">
                                <AlertCircle className="w-10 h-10 text-slate-300 mb-3" />
                                <p className="text-base font-medium text-slate-700">No complaints found.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            {/* Sidebar Content Area (Desktop Right) */}
            <div className="space-y-8">
              
              {/* Nearby & Popular Issues */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> Popular Issues
                </h2>
                <div className="space-y-4">
                  {popularIssues.map(issue => (
                    <div key={issue.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <h4 className="font-semibold text-slate-800 mb-1">{issue.title}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                        <MapPin className="w-3 h-3" /> {issue.location}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                          {issue.affectedCount} affected
                        </span>
                        <button 
                          onClick={() => confirmPopularIssue(issue.id)}
                          disabled={issue.confirmed}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                            issue.confirmed 
                            ? 'bg-green-50 text-green-700 border-green-200 cursor-not-allowed' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {issue.confirmed ? <CheckCircle className="w-3.5 h-3.5" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                          {issue.confirmed ? "Confirmed" : "I have this issue"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Campus Activity */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-500" /> Campus Activity
                </h2>
                <div className="space-y-4">
                  {MOCK_ACTIVITIES.map(activity => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {activity.type === 'success' && <div className="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-50 mt-1.5" />}
                        {activity.type === 'warning' && <div className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-50 mt-1.5" />}
                        {activity.type === 'info' && <div className="w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-50 mt-1.5" />}
                      </div>
                      <div>
                        <p className="text-sm text-slate-700 leading-tight">{activity.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </div>
        </main>
      </div>

      {/* Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Report an Issue</h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Issue Type</label>
                  <select 
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option>Water</option>
                    <option>Electricity</option>
                    <option>WiFi</option>
                    <option>Cleaning</option>
                    <option>Infrastructure</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Rajendra Bhawan, Room 204"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <button 
                      type="button"
                      onClick={handleGetLocation}
                      title="Use Current Location"
                      className="flex-shrink-0 flex items-center justify-center px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <MapPin className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about the issue..."
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Photo (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                  <select 
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
