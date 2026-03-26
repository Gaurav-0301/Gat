// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthContext } from './hooks/useAuthContext';
import Loader from './components/Shared/Loader';

// Pages / Components (adjust paths if needed)
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './pages/Dashboard';
import AppointmentList from './components/Appointment/AppointmentList';
import AppointmentCreate from './components/Appointment/AppointmentCreate';
import AppointmentDetail from './components/Appointment/AppointmentDetails';
import VisitorList from './components/Visitor/VisitorList';
import VisitorRegister from './components/Visitor/VisitorRegister';
import CheckLogList from './components/Checklog/CheckLogList';
import CheckIn from './components/Checklog/CheckIn';
import PassList from './components/Pass/PassList';
import PassIssue from './components/Pass/PassIssue';
import MyPass from './components/Pass/MyPass';
import ProfileVisitor from './pages/ProfileVisitor';
import UserManagement from './components/User/UserManagement';
import Navbar from './components/Shared/Navbar';
import NotFound from './pages/NotFound';

const RequireAuth = ({ children, allowed = [] }) => {
  const { user, authIsReady } = useAuthContext();

  // If auth hasn't finished initializing, show loader so we don't redirect prematurely
  if (authIsReady === false) return <Loader />;

  // Not logged in -> go to login
  if (!user) return <Navigate to="/login" replace />;

  // If allowed roles provided, check them
  if (Array.isArray(allowed) && allowed.length > 0) {
    if (!allowed.includes(user.role)) {
      // user logged in but not authorized -> go to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Authorized
  return children;
};

function App() {
  return (
    <Router>
      <Navbar />
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />

          {/* Appointments */}
          <Route
            path="/appointments"
            element={
              <RequireAuth>
                <AppointmentList />
              </RequireAuth>
            }
          />
          <Route
            path="/appointments/create"
            element={
              // allow admin, employee, and visitor to create appointments
              <RequireAuth allowed={['admin', 'employee', 'visitor']}>
                <AppointmentCreate />
              </RequireAuth>
            }
          />
          <Route
            path="/appointments/:id"
            element={
              <RequireAuth allowed={['admin', 'employee', 'visitor']}>
                <AppointmentDetail />
              </RequireAuth>
            }
          />

          {/* Visitors */}
          <Route
            path="/visitors"
            element={
              <RequireAuth>
                <VisitorList />
              </RequireAuth>
            }
          />
          <Route
            path="/visitors/register"
            element={
              <RequireAuth allowed={['admin', 'security']}>
                <VisitorRegister />
              </RequireAuth>
            }
          />

          {/* User Management - Admin Only */}
          <Route
            path="/users"
            element={
              <RequireAuth allowed={['admin']}>
                <UserManagement />
              </RequireAuth>
            }
          />

          {/* Checklogs / Checkin */}
          <Route
            path="/checklogs"
            element={
              <RequireAuth>
                <CheckLogList />
              </RequireAuth>
            }
          />
          <Route
            path="/checklogs/checkin"
            element={
              <RequireAuth allowed={['admin', 'security']}>
                <CheckIn />
              </RequireAuth>
            }
          />

          {/* Passes */}
          <Route
            path="/passes"
            element={
              <RequireAuth>
                <PassList />
              </RequireAuth>
            }
          />
          <Route
            path="/passes/issue"
            element={
              <RequireAuth allowed={['admin', 'security']}>
                <PassIssue />
              </RequireAuth>
            }
          />
          <Route
            path="/my-pass"
            element={
              <RequireAuth allowed={['visitor']}>
                <MyPass />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth allowed={['visitor', 'employee']}>
                <ProfileVisitor />
              </RequireAuth>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme="colored" />
    </Router>
  );
}

export default App;
