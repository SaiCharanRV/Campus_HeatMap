import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { homeFor } from './utils/constants.js';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Navbar from './components/common/Navbar.jsx';
import Loader from './components/common/Loader.jsx';
import AlertBanner from './components/alerts/AlertBanner.jsx';

import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyOtp from './pages/auth/VerifyOtp.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';

import StudentDashboard from './pages/student/Dashboard.jsx';
import NewComplaint from './pages/student/NewComplaint.jsx';
import ComplaintDetail from './pages/student/ComplaintDetail.jsx';

import SupervisorDashboard from './pages/staff/SupervisorDashboard.jsx';
import WorkerDashboard from './pages/staff/WorkerDashboard.jsx';
import ComplaintManage from './pages/staff/ComplaintManage.jsx';
import Alerts from './pages/staff/Alerts.jsx';

import Analytics from './pages/admin/Analytics.jsx';
import Users from './pages/admin/Users.jsx';
import Locations from './pages/admin/Locations.jsx';
import Mappings from './pages/admin/Mappings.jsx';
import QrCodes from './pages/admin/QrCodes.jsx';
import ReportRedirect from './pages/ReportRedirect.jsx';

import LocationComplaints from './pages/LocationComplaints.jsx';
import NotFound from './pages/NotFound.jsx';

function AppLayout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <AlertBanner />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loader fullPage />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

const guard = (roles, element) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;
const STAFF = ['supervisor', 'worker', 'admin'];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={guard(null, <AppLayout />)}>
        <Route path="/dashboard" element={guard(['student'], <StudentDashboard />)} />
        <Route path="/complaints/new" element={guard(['student'], <NewComplaint />)} />
        <Route path="/complaints/:id" element={guard(['student'], <ComplaintDetail />)} />
        <Route path="/location/:id" element={<LocationComplaints />} />
        <Route path="/report" element={<ReportRedirect />} />

        <Route path="/staff" element={guard(['supervisor', 'admin'], <SupervisorDashboard />)} />
        <Route path="/worker" element={guard(['worker'], <WorkerDashboard />)} />
        <Route path="/staff/complaints/:id" element={guard(STAFF, <ComplaintManage />)} />
        <Route path="/staff/alerts" element={guard(['supervisor', 'admin'], <Alerts />)} />

        <Route path="/admin" element={guard(['admin'], <Analytics />)} />
        <Route path="/admin/users" element={guard(['admin'], <Users />)} />
        <Route path="/admin/locations" element={guard(['admin'], <Locations />)} />
        <Route path="/admin/mappings" element={guard(['admin'], <Mappings />)} />
        <Route path="/admin/qr" element={guard(['admin'], <QrCodes />)} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
