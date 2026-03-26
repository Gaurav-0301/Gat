import React, { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { useAuthContext } from '../hooks/useAuthContext';
import Loader from '../components/Shared/Loader';

const ProfileVisitor = () => {
  const { user, login } = useAuthContext();
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', department: '' });
  const [originalForm, setOriginalForm] = useState({ name: '', email: '', phone: '', role: '', department: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isVisitor = (user?.role || '').toLowerCase() === 'visitor';
  const isEmployee = (user?.role || '').toLowerCase() === 'employee';
  const canEditProfile = isVisitor || isEmployee;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await authAPI.getProfile();
        if (!mounted) return;
        const profileData = {
          name: data?.name || '',
          email: data?.email || '',
          phone: data?.phone || '',
          role: (data?.role || '').toLowerCase(),
          department: data?.department || ''
        };
        setForm(profileData);
        setOriginalForm(profileData);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/.+@.+\..+/.test(form.email)) return 'Enter a valid email address';
    if (!form.phone.trim()) return 'Phone is required';
    return '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const v = validate();
    if (v) { setError(v); return; }
    try {
      setSaving(true);
      const payload = { 
        name: form.name.trim(), 
        email: form.email.trim(), 
        phone: form.phone.trim()
      };
      // Include department for employees
      if (isEmployee && form.department) {
        payload.department = form.department.trim();
      }
      const updated = await authAPI.updateProfile(payload);
      if (updated?.error) throw new Error(updated.error);
      setSuccess('Profile updated successfully');
      // Update auth context/localStorage to keep UI consistent
      try {
        const storedRaw = localStorage.getItem('user');
        const stored = storedRaw ? JSON.parse(storedRaw) : {};
        const merged = { ...stored, name: updated.name, email: updated.email };
        login(merged);
      } catch (_) { /* ignore */ }
      // Update original form and exit edit mode
      const updatedData = { ...form };
      setOriginalForm(updatedData);
      setIsEditing(false);
    } catch (e) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setError('');
    setSuccess('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm({ ...originalForm });
    setError('');
    setSuccess('');
    setIsEditing(false);
  };

  if (!canEditProfile) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Profile</h2>
        <p>This section is available only for visitor and employee accounts.</p>
      </div>
    );
  }

  if (loading) return <Loader />;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
      <h2>My Profile</h2>
      {error && <div style={{ color: 'crimson', marginBottom: 12, padding: '10px', backgroundColor: '#fee', borderRadius: '4px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 12, padding: '10px', backgroundColor: '#efe', borderRadius: '4px' }}>{success}</div>}
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input 
            id="name" 
            name="name" 
            type="text" 
            value={form.name} 
            onChange={onChange}
            disabled={!isEditing}
            style={{ 
              backgroundColor: !isEditing ? '#f5f5f5' : 'white',
              cursor: !isEditing ? 'not-allowed' : 'text'
            }}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            value={form.email} 
            onChange={onChange}
            disabled={!isEditing}
            style={{ 
              backgroundColor: !isEditing ? '#f5f5f5' : 'white',
              cursor: !isEditing ? 'not-allowed' : 'text'
            }}
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input 
            id="phone" 
            name="phone" 
            type="text" 
            value={form.phone} 
            onChange={onChange}
            disabled={!isEditing}
            style={{ 
              backgroundColor: !isEditing ? '#f5f5f5' : 'white',
              cursor: !isEditing ? 'not-allowed' : 'text'
            }}
          />
        </div>
        {isEmployee && (
          <div className="form-group">
            <label htmlFor="department">Department</label>
            <input 
              id="department" 
              name="department" 
              type="text" 
              value={form.department || ''} 
              onChange={onChange}
              disabled={!isEditing}
              style={{ 
                backgroundColor: !isEditing ? '#f5f5f5' : 'white',
                cursor: !isEditing ? 'not-allowed' : 'text'
              }}
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="role">Role</label>
          <input 
            id="role" 
            name="role" 
            type="text" 
            value={form.role} 
            readOnly
            disabled
            style={{ 
              backgroundColor: '#f5f5f5',
              cursor: 'not-allowed'
            }}
          />
        </div>
        {!isEditing ? (
          <button 
            className="btn-primary" 
            onClick={handleEdit}
            type="button"
            style={{ marginTop: '20px', width: '100%' }}
          >
            Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button className="btn-primary" type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button 
              type="button" 
              onClick={handleCancel}
              disabled={saving}
              style={{ 
                flex: 1,
                backgroundColor: '#6c757d', 
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ProfileVisitor;
