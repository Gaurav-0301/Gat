import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import StatCard from '../components/Shared/StatCard';
import Loader from '../components/Shared/Loader';
import { visitorAPI, appointmentAPI, passesAPI, checkLogsAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    visitors: { totalVisitors: 0, blacklistedVisitors: 0 },
    appointments: { total: 0, pending: 0, approved: 0, todayAppointments: 0 },
    passes: { total: 0, active: 0, expired: 0 },
    checkLogs: { currentlyInside: 0, todayCheckIns: 0 }
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      const role = (user?.role || '').toLowerCase();
      const isVisitor = role === 'visitor';
      const isEmployee = role === 'employee';
      const isAdminOrSecurity = role === 'admin' || role === 'security';

      // Allow employees to see aggregated visitor stats along with admin/security
      const visitorsPromise = (user && (isAdminOrSecurity || isEmployee))
        ? visitorAPI.getStats().catch((err) => {
            console.error('Visitor stats error:', err);
            return { totalVisitors: 0, blacklistedVisitors: 0 };
          })
        : Promise.resolve({ totalVisitors: 0, blacklistedVisitors: 0 });

      const appointmentsPromise = isVisitor
        ? (async () => {
            // Build visitor-specific stats from their own appointments
            const res = await appointmentAPI.getMy();
            let list = res?.appointments || res?.data || res || [];
            if (!Array.isArray(list)) list = [];

            const today = new Date();
            const isSameDay = (d1, d2) => (
              d1.getFullYear() === d2.getFullYear() &&
              d1.getMonth() === d2.getMonth() &&
              d1.getDate() === d2.getDate()
            );

            const total = list.length;
            const pending = list.filter(a => a.status === 'pending').length;
            const approved = list.filter(a => a.status === 'approved').length;
            const todayAppointments = list.filter(a => {
              if (!a?.appointmentDate) return false;
              const d = new Date(a.appointmentDate);
              return !Number.isNaN(d.getTime()) && isSameDay(d, today);
            }).length;

            return { total, pending, approved, todayAppointments };
          })().catch((err) => {
            console.error('Appointment stats (visitor) error:', err);
            return { total: 0, pending: 0, approved: 0, todayAppointments: 0 };
          })
        : appointmentAPI.getStats().catch((err) => {
            console.error('Appointment stats error:', err);
            return { total: 0, pending: 0, approved: 0, todayAppointments: 0 };
          });

      const [visitorsStats, appointmentsStats, passesStats, checkLogsStats] = await Promise.all([
        visitorsPromise,
        appointmentsPromise,
        passesAPI.getStats().catch((err) => {
          console.error('Pass stats error:', err);
          return { total: 0, active: 0, expired: 0 };
        }),
        checkLogsAPI.getStats().catch((err) => {
          console.error('CheckLog stats error:', err);
          return { currentlyInside: 0, todayCheckIns: 0 };
        })
      ]);

      setStats({
        visitors: visitorsStats || { totalVisitors: 0, blacklistedVisitors: 0 },
        appointments: appointmentsStats || { total: 0, pending: 0, approved: 0, todayAppointments: 0 },
        passes: passesStats || { total: 0, active: 0, expired: 0 },
        checkLogs: checkLogsStats || { currentlyInside: 0, todayCheckIns: 0 }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <Loader />;

  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isEmployee = role === 'employee';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name}!</p>
      </div>

      <div className="stats-grid">
        {(isAdmin || isEmployee) && (
          <StatCard 
            title="Total Visitors" 
            value={stats.visitors.totalVisitors} 
            icon="👥" 
            color="blue" 
          />
        )}
        {(isAdmin || isEmployee) && (
          <StatCard 
            title="Currently Inside" 
            value={stats.checkLogs.currentlyInside} 
            icon="🏢" 
            color="green" 
          />
        )}
        {(isAdmin || isEmployee) && (
          <StatCard 
            title="Today's Check-ins" 
            value={stats.checkLogs.todayCheckIns} 
            icon="✅" 
            color="orange" 
          />
        )}
        <StatCard 
          title="Active Passes" 
          value={stats.passes.active} 
          icon="🎫" 
          color="blue" 
        />
      </div>

      <div className="stats-grid">
        <StatCard 
          title="Total Appointments" 
          value={stats.appointments.total} 
          icon="📅" 
          color="blue" 
        />
        {(isAdmin || isEmployee) && (
          <StatCard 
            title="Pending Approvals" 
            value={stats.appointments.pending} 
            icon="⏳" 
            color="orange" 
          />
        )}
        <StatCard 
          title="Today's Appointments" 
          value={stats.appointments.todayAppointments} 
          icon="📌" 
          color="green" 
        />
        {(isAdmin || isEmployee) && (
          <StatCard 
            title="Blacklisted Visitors" 
            value={stats.visitors.blacklistedVisitors} 
            icon="🚫" 
            color="red" 
          />
        )}
      </div>

      <div className="dashboard-cards">
        {(role === 'admin' || role === 'security') && (
          <div className="dashboard-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <Link to="/visitors/register" className="action-btn">
                ➕ Register Visitor
              </Link>
              <Link to="/passes/issue" className="action-btn">
                🎫 Issue Pass
              </Link>
              <Link to="/checklogs" className="action-btn">
                ✅ Check In/Out
              </Link>
            </div>
          </div>
        )}

        {(user?.role === 'admin' || user?.role === 'employee' || user?.role === 'visitor') && (
          <div className="dashboard-card">
            <h3>Appointment Actions</h3>
            <div className="quick-actions">
              <Link to="/appointments/create" className="action-btn">
                📅 Create Appointment
              </Link>
              { (user?.role === 'admin' || user?.role === 'employee') ? (
                <Link to="/appointments?status=pending" className="action-btn">
                  ⏳ Pending Approvals
                </Link>
              ) : (
                <Link to="/appointments?mine=1" className="action-btn">
                  📂 My Appointments
                </Link>
              ) }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;