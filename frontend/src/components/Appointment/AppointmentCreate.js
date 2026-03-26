// src/components/appointments/AppointmentCreate.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { appointmentAPI, visitorAPI, usersAPI } from '../../services/api';
import { useAuthContext } from '../../hooks/useAuthContext';
import { notifySuccess, notifyError } from '../../utils/notifications';
import './Appointment.css';

const AppointmentCreate = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [visitorPhoto, setVisitorPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    visitorId: '',
    hostId: '',
    appointmentDate: '',
    appointmentTime: '',
    duration: 60,
    purpose: '',
    location: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuthContext();

  const fetchVisitorsAndHosts = async () => {
    try {
      const [visitorsData, usersData] = await Promise.all([
        visitorAPI.getAll({ limit: 100 }).catch(() => ({ visitors: [] })),
        usersAPI.getHosts().catch(() => ({ users: [] }))
      ]);

      const visitorsList = visitorsData?.visitors ?? visitorsData ?? [];
      setVisitors(Array.isArray(visitorsList) ? visitorsList : []);

      const usersList = usersData?.users ?? usersData ?? [];
      const normalize = (value) => (value || '').toString().trim().toLowerCase();

      const filteredHosts = Array.isArray(usersList)
        ? usersList.filter((userItem) => {
            const role = normalize(userItem.role);
            return role === 'employee';
          })
        : [];

      setHosts(filteredHosts);
    } catch (err) {
      console.error('Error fetching visitors/hosts:', err);
      setVisitors([]);
      setHosts([]);
    }
  };

  useEffect(() => {
    fetchVisitorsAndHosts();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setVisitorPhoto(null);
      setPhotoPreview(null);
      return;
    }

    // Validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, JPEG, and PNG images are allowed');
      setVisitorPhoto(null);
      setPhotoPreview(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo size must be less than 5MB');
      setVisitorPhoto(null);
      setPhotoPreview(null);
      return;
    }

    // Update state correctly
    setError(null);
    setVisitorPhoto(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // FIX: Use the file directly from the state check
    if (!visitorPhoto) {
      setError('Visitor photo is required');
      notifyError('Visitor photo is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      
      formDataToSend.append('hostId', formData.hostId);
      formDataToSend.append('appointmentDate', formData.appointmentDate);
      formDataToSend.append('appointmentTime', formData.appointmentTime);
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('purpose', formData.purpose);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('notes', formData.notes);
      
      if (formData.visitorId) {
        formDataToSend.append('visitorId', formData.visitorId);
      }

      // CRITICAL FIX: Ensure the field name is 'photo' to match backend middleware
      formDataToSend.append('photo', visitorPhoto);

      if (user && user.role === 'visitor') {
        formDataToSend.append('visitorId', user._id || user.id || formData.visitorId);
      }

      const res = await appointmentAPI.create(formDataToSend);

      if (res?.error || res?.success === false) {
        throw res;
      }

      notifySuccess('Appointment created successfully!');
      navigate('/appointments');
    } catch (err) {
      console.error('Create appointment error:', err);
      const message =
        err?.response?.data?.error ||
        err?.error ||
        err?.message ||
        (typeof err === 'string' ? err : 'Failed to create appointment');
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appointment-create-container">
      <div className="form-card">
        <h2>Create Appointment</h2>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
              {user?.role !== 'visitor' && (
                <div className="form-group">
                  <label>Visitor</label>
                  <select
                    name="visitorId"
                    value={formData.visitorId}
                    onChange={handleChange}
                  >
                    <option value="">Guest / Unregistered</option>
                    {visitors.map(visitor => (
                      <option key={visitor._id || visitor.id} value={visitor._id || visitor.id}>
                        {visitor.name} - {visitor.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div className="form-group">
              <label>Host *</label>
              <select
                name="hostId"
                value={formData.hostId}
                onChange={handleChange}
                required
              >
                <option value="">Select Host</option>
                {hosts.map(host => (
                  <option key={host._id || host.id} value={host._id || host.id}>
                    {host.name} - {host.department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Appointment Date *</label>
              <input
                type="date"
                name="appointmentDate"
                value={formData.appointmentDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label>Appointment Time *</label>
              <input
                type="time"
                name="appointmentTime"
                value={formData.appointmentTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duration (minutes) *</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="15"
                step="15"
                required
              />
            </div>

            <div className="form-group">
              <label>Location *</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Conference Room A, Building 2"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Purpose *</label>
            <input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              placeholder="e.g. Business Meeting, Interview"
              required
            />
          </div>

          <div className="form-group">
            <label>Visitor Photo * (JPG, JPEG, PNG)</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handlePhotoChange}
              required
            />
            {photoPreview && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <img
                  src={photoPreview}
                  alt="Visitor preview portrait"
                  style={{
                    maxWidth: '150px',
                    maxHeight: '150px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="4"
              placeholder="Any additional information."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentCreate;
