// PassIssue.js (fixed)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { passesAPI, visitorAPI, usersAPI } from '../../services/api';
import './Pass.css';
import { notifySuccess, notifyError } from '../../utils/notifications';

const PassIssue = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [formData, setFormData] = useState({
    visitorId: '',
    hostId: '',
    validFrom: new Date().toISOString().slice(0, 16),
    validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // default +1 hour
    accessAreas: [],
    specialInstructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // moved function above useEffect for clarity
  const fetchData = async () => {
    try {
      const [visitorsData, hostsData] = await Promise.all([
        visitorAPI.getAll({ limit: 100 }),
        usersAPI.getHosts()
      ]);

      // API may return arrays directly or wrapped objects
      const visitorsList = visitorsData?.visitors || visitorsData || [];
      const hostsList = hostsData?.users || hostsData || [];
      const normalize = (val) => (val || '').toString().trim().toLowerCase();

      // Show all employees (including newly created ones)
      const filteredHosts = Array.isArray(hostsList)
        ? hostsList.filter((h) => {
            const role = normalize(h.role);
            return role === 'employee';
          })
        : [];
      
      setVisitors(Array.isArray(visitorsList) ? visitorsList : []);
      setHosts(filteredHosts);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAccessAreasChange = (e) => {
    const value = e.target.value;
    const areas = value.split(',').map(area => area.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      accessAreas: areas
    }));
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation to match backend requirements
    if (!formData.visitorId || !formData.hostId || !formData.validUntil) {
      setError('Visitor, Host and Valid Until are required');
      setLoading(false);
      return;
    }

    try {
      // prepare payload: ensure accessAreas is array
      const payload = {
        ...formData,
        accessAreas: Array.isArray(formData.accessAreas) ? formData.accessAreas : []
      };

      const res = await passesAPI.issue(payload);
      // accept either { success: true } or direct pass object
      if (res?.error || (res?.success === false)) {
        throw res;
      }

      notifySuccess('Pass issued successfully! Email sent to visitor.');
      navigate('/passes');
    } catch (err) {
      // err might be an Error object or a response-like object
      const message = err?.message || err?.error || err?.msg || 'Failed to issue pass';
      setError(message);
      console.error('Issue pass error:', err);
      notifyError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pass-issue-container">
      <div className="form-card">
        <h2>Issue Visitor Pass</h2>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          

          <div className="form-row">
            <div className="form-group">
              <label>Visitor *</label>
              <select
                name="visitorId"
                value={formData.visitorId}
                onChange={handleChange}
                required
              >
                <option value="">Select Visitor</option>
                {visitors.map(visitor => (
                  <option key={visitor._id || visitor.id} value={visitor._id || visitor.id}>
                    {visitor.name} - {visitor.email}
                  </option>
                ))}
              </select>
            </div>

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
              <label>Valid From *</label>
              <input
                type="datetime-local"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Valid Until *</label>
              <input
                type="datetime-local"
                name="validUntil"
                value={formData.validUntil}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Access Areas (comma-separated)</label>
            <input
              type="text"
              value={Array.isArray(formData.accessAreas) ? formData.accessAreas.join(', ') : ''}
              onChange={handleAccessAreasChange}
              placeholder="e.g., Lobby, Meeting Room A, Cafeteria"
            />
            <small>Enter areas separated by commas</small>
          </div>

          <div className="form-group">
            <label>Special Instructions</label>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleChange}
              rows="4"
              placeholder="Any special instructions for security..."
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/passes')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Issuing...' : 'Issue Pass'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PassIssue;
