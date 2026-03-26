// VisitorRegister.js (fixed)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { visitorAPI } from '../../services/api';
import './Visitor.css';
import { notifySuccess, notifyError } from '../../utils/notifications';

const VisitorRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    idType: 'passport',
    idNumber: '',
    address: '',
    purpose: '',
    vehicleNumber: ''
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const previewUrlRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // cleanup object URL on unmount
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // revoke previous preview if any
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setPhoto(file);
      setPhotoPreview(url);
    } else {
      // no file selected
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPhoto(null);
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!photo) {
      setError('Photo is required. Please upload a clear photo of the visitor.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      Object.keys(formData).forEach(key => {
        // ensure null/undefined converted to empty string for form submission
        payload.append(key, formData[key] ?? '');
      });
      payload.append('photo', photo);

      const res = await visitorAPI.create(payload);

      // server might return { success: true } or the created visitor object
      if (res?.error || res?.success === false) {
        throw res;
      }

      notifySuccess('Visitor registered successfully!');
      navigate('/visitors');
    } catch (err) {
      console.error('Registration error:', err);
      const message = err?.message || err?.error || 'Failed to register visitor';
      setError(message);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="visitor-register-container">
      <div className="form-card">
        <h2>Register New Visitor</h2>

        {error && <div className="error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ID Type *</label>
              <select
                name="idType"
                value={formData.idType}
                onChange={handleChange}
                required
              >
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
                <option value="national_id">National ID</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>ID Number *</label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Purpose of Visit *</label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                required
                placeholder="e.g., Meeting, Interview, Delivery"
              />
            </div>

            <div className="form-group">
              <label>Vehicle Number</label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Photo *</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              required
              aria-required="true"
            />
            {photoPreview && (
              <div className="photo-preview">
                <img src={photoPreview} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/visitors')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Registering...' : 'Register Visitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VisitorRegister;
