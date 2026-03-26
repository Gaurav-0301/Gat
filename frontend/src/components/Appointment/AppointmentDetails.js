// src/components/appointments/AppointmentDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { appointmentAPI } from '../../services/api';
import { useAuthContext } from '../../hooks/useAuthContext';
import Loader from '../Shared/Loader';
import { notifySuccess, notifyError, notifyInfo } from '../../utils/notifications';
import './Appointment.css';

const AppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  // fallback to localStorage in case context isn't hydrated yet
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch (e) {
      return null;
    }
  })();
  const effectiveUser = user || storedUser;
  const effectiveRole = effectiveUser?.role;
  const effectiveUserId = effectiveUser?._id || effectiveUser?.id;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const data = await appointmentAPI.getById(id);
      // Employees can only view their own hosted appointments
      if (effectiveRole === 'employee' && effectiveUserId) {
        const hostId = data?.host?._id || data?.host?.id || data?.host;
        if (!hostId || hostId.toString() !== effectiveUserId.toString()) {
          throw new Error('Forbidden: not your appointment');
        }
      }
      setAppointment(data);
    } catch (err) {
      console.error('Error fetching appointment:', err);
      const message = err?.message || 'Failed to load appointment details.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApprove = async () => {
    if (window.confirm('Approve this appointment?')) {
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem('user')) || null; } catch (e) { return null; }
      })();
      if (!stored || (stored.role !== 'admin' && stored.role !== 'employee')) {
        notifyError('Action blocked: current session token is not authorized to approve. Please login as admin/employee.');
        return;
      }
      if (stored.role === 'employee' && effectiveUserId && appointment?.host?._id && appointment.host._id.toString() !== effectiveUserId.toString()) {
        notifyError('Action blocked: only the assigned host can approve this appointment.');
        return;
      }
      try {
        await appointmentAPI.approve(id);
        notifySuccess('Appointment approved!');
        fetchAppointment();
      } catch (err) {
        console.error('Error approving appointment:', err);
        notifyError(err?.message || 'Failed to approve appointment.');
      }
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem('user')) || null; } catch (e) { return null; }
    })();
    if (!stored || (stored.role !== 'admin' && stored.role !== 'employee')) {
      notifyError('Action blocked: current session token is not authorized to reject. Please login as admin/employee.');
      return;
    }
    if (stored.role === 'employee' && effectiveUserId && appointment?.host?._id && appointment.host._id.toString() !== effectiveUserId.toString()) {
      notifyError('Action blocked: only the assigned host can reject this appointment.');
      return;
    }
    try {
      await appointmentAPI.reject(id, { rejectionReason: reason });
      notifyInfo('Appointment rejected.');
      fetchAppointment();
    } catch (err) {
      console.error('Error rejecting appointment:', err);
      notifyError(err?.message || 'Failed to reject appointment.');
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Delete this appointment?')) {
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem('user')) || null; } catch (e) { return null; }
      })();
      if (!stored || (stored.role !== 'admin' && stored.role !== 'employee' && stored.role !== 'visitor')) {
        notifyError('Action blocked: current session token is not authorized to delete. Please login as admin/employee/visitor.');
        return;
      }
      if (stored.role === 'employee' && effectiveUserId && appointment?.host?._id && appointment.host._id.toString() !== effectiveUserId.toString()) {
        notifyError('Action blocked: only the assigned host can delete this appointment.');
        return;
      }
      try {
        await appointmentAPI.delete(id);
        notifyInfo('Appointment deleted.');
        navigate('/appointments');
      } catch (err) {
        console.error('Error deleting appointment:', err);
        notifyError(err?.message || 'Failed to delete appointment.');
      }
    }
  };

  if (loading) return <Loader />;
  if (error) {
    return (
      <div className="appointment-detail-container">
        <p className="error">{error}</p>
        <button className="btn-primary" onClick={() => navigate('/appointments')}>
          ← Back to Appointments
        </button>
      </div>
    );
  }
  if (!appointment) return null;

  const { visitor, host, purpose, location, status, appointmentDate, appointmentTime, notes, visitorPhoto } =
    appointment;

  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString()
    : 'N/A';
  const formattedTime = appointmentTime || (appointmentDate ? new Date(appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A');

  // Helper function to convert relative path to absolute URL
  const toAbsoluteUrl = (path) => {
    if (!path) return null;
    const str = String(path);
    if (/^https?:\/\//i.test(str)) return str;
    const baseApi = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const base = baseApi.replace(/\/api\/?$/, '');
    const normalized = str.startsWith('/') ? str : `/${str}`;
    return `${base}${normalized}`;
  };

  return (
    <div className="appointment-detail-container">
      <div className="detail-card">
        <div className="detail-content">
          <h2>Appointment Details</h2>
          <div className="detail-row">
            <strong>Visitor:</strong> {visitor?.name || 'N/A'} ({visitor?.email || '—'})
          </div>
          <div className="detail-row">
            <strong>Host:</strong> {host?.name || 'N/A'} ({host?.department || '—'})
          </div>
          <div className="detail-row">
            <strong>Date &amp; Time:</strong> {formattedDate} at {formattedTime}
          </div>
          <div className="detail-row">
            <strong>Purpose:</strong> {purpose || '—'}
          </div>
          <div className="detail-row">
            <strong>Location:</strong> {location || '—'}
          </div>
          <div className="detail-row">
            <strong>Status:</strong>{' '}
            <span className={`badge badge-${status}`}>{status?.toUpperCase()}</span>
          </div>
          {notes && (
            <div className="detail-row">
              <strong>Notes:</strong> {notes}
            </div>
          )}

          <div className="actions">
            <button className="btn-secondary" onClick={() => navigate('/appointments')}>
              ← Back
            </button>

            {(effectiveRole === 'admin' || (effectiveRole === 'employee' && effectiveUserId && appointment?.host?._id && appointment.host._id.toString() === effectiveUserId.toString())) && (
              <>
                {status === 'pending' && (
                  <>
                    <button className="btn-green" onClick={handleApprove}>
                      ✅ Approve
                    </button>
                    <button className="btn-red" onClick={handleReject}>
                      ❌ Reject
                    </button>
                  </>
                )}
                {status !== 'cancelled' && status !== 'rejected' && (
                  <button className="btn-orange" onClick={handleCancel}>
                    🗑️ Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="detail-photo-section">
          <h3>Visitor Photo</h3>
          <div className="visitor-photo-container">
            {visitorPhoto ? (
              <img 
                src={toAbsoluteUrl(visitorPhoto)} 
                alt="Visitor identification"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.parentElement) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'visitor-photo-placeholder';
                    placeholder.textContent = 'No photo provided';
                    e.target.parentElement.appendChild(placeholder);
                  }
                }}
              />
            ) : (
              <div className="visitor-photo-placeholder">No photo provided</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;
