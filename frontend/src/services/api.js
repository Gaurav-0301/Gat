// api.js  (fixed)
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// build headers safely
const getAuthHeaders = (isJson = true) => {
  const headers = { Accept: 'application/json' };
  let user = null;
  try {
    const raw = localStorage.getItem('user');
    user = raw ? JSON.parse(raw) : null;
  } catch (err) {
    user = null;
  }

  if (isJson) headers['Content-Type'] = 'application/json';
  if (user && user.token) {
    headers['Authorization'] = `Bearer ${user.token}`;
  }

  // Removed dev-only debug logging from headers builder

  return headers;
};

// Parse response safely: prefer JSON when available, otherwise return text
const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
};

// Visitors API
export const visitorAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/visitors?${queryString}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getOne: async (id) => {
    const response = await fetch(`${API_URL}/visitors/${id}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // create expects FormData (file uploads), so don't set Content-Type
  // use authenticated endpoint when a token exists; otherwise fall back to public register
  create: async (formData) => {
    let url = `${API_URL}/visitors/register`;
    let headers = getAuthHeaders(false);

    try {
      const raw = localStorage.getItem('user');
      const stored = raw ? JSON.parse(raw) : null;
      if (stored && stored.token) {
        url = `${API_URL}/visitors`;
        headers = getAuthHeaders(false);
      }
    } catch (_) {
      // ignore parse errors; default to public
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    return response.json();
  },

  update: async (id, formData) => {
    const response = await fetch(`${API_URL}/visitors/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(false),
      body: formData
    });
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/visitors/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  toggleBlacklist: async (id, data) => {
    const response = await fetch(`${API_URL}/visitors/${id}/blacklist`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_URL}/visitors/stats`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
};

// Appointments API
export const appointmentAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/appointments?${queryString}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // keep both names for compatibility
  getOne: async (id) => {
    const response = await fetch(`${API_URL}/appointments/${id}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getById: async (id) => {
    return appointmentAPI.getOne(id);
  },

  create: async (data) => {
    // If user is logged in, use authenticated endpoint; otherwise use public endpoint
    let user = null;
    try {
      const raw = localStorage.getItem('user');
      user = raw ? JSON.parse(raw) : null;
    } catch (e) {
      user = null;
    }

    const url = user && user.token ? `${API_URL}/appointments` : `${API_URL}/appointments/public`;
    
    // Check if data is FormData (for file uploads)
    const isFormData = data instanceof FormData;
    
    // Build headers - if FormData, don't set Content-Type (let browser set it with boundary)
    let headers = {};
    if (user && user.token) {
      headers['Authorization'] = `Bearer ${user.token}`;
    }
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
    } else {
      headers['Accept'] = 'application/json';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data)
    });
    return response.json();
  },

  // Get appointments for the authenticated visitor
  getMy: async () => {
    const response = await fetch(`${API_URL}/appointments/my`, {
      headers: getAuthHeaders()
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      const err = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
      throw new Error(err);
    }
    return data;
  },

  approve: async (id) => {
    const response = await fetch(`${API_URL}/appointments/${id}/approve`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      const err = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
      throw new Error(err);
    }
    return data;
  },

  // backend expects { rejectionReason }
  reject: async (id, rejectionReason) => {
    const body = typeof rejectionReason === 'string'
      ? { rejectionReason }
      : (rejectionReason || {});
    const response = await fetch(`${API_URL}/appointments/${id}/reject`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      const err = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
      throw new Error(err);
    }
    return data;
  },

  cancel: async (id) => {
    const response = await fetch(`${API_URL}/appointments/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      const err = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
      throw new Error(err);
    }
    return data;
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      const err = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
      throw new Error(err);
    }
    return data;
  },

  getStats: async () => {
    const response = await fetch(`${API_URL}/appointments/stats`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },
};

// Passes API
export const passesAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/passes?${queryString}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getOne: async (id) => {
    const response = await fetch(`${API_URL}/passes/${id}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  issue: async (data) => {
    const response = await fetch(`${API_URL}/passes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },

  verify: async (value) => {
    const response = await fetch(`${API_URL}/passes/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ value })
    });
    return response.json();
  },

  revoke: async (id) => {
    const response = await fetch(`${API_URL}/passes/${id}/revoke`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_URL}/passes/stats`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getMyActive: async () => {
    const response = await fetch(`${API_URL}/passes/my/active`, {
      headers: getAuthHeaders()
    });
    if (response.status === 404) {
      return null; // no active pass
    }
    const data = await parseResponse(response);
    if (!response.ok) {
      const err = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
      throw new Error(err);
    }
    return data;
  },

  // Alias per requirement: GET /api/passes/my
  getMy: async () => {
    try {
      const response = await fetch(`${API_URL}/passes/my`, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 401) {
        console.error('[passesAPI.getMy] Unauthorized - invalid or expired token');
        throw new Error('UNAUTHORIZED');
      }
      
      if (response.status === 404) {
        return { data: null };
      }
      
      const data = await parseResponse(response);
      
      if (!response.ok) {
        const err = (data && data.error) ? data.error : (typeof data === 'string' ? data : JSON.stringify(data));
        console.error('[passesAPI.getMy] Request failed:', err);
        throw new Error(err);
      }
      
      return { data };
    } catch (error) {
      console.error('[passesAPI.getMy] Error:', error.message);
      throw error;
    }
  }
};

// Check logs API
export const checkLogsAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_URL}/checklogs?${queryString}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  checkIn: async (data) => {
    const response = await fetch(`${API_URL}/checklogs/checkin`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  },

  // corrected path to /checklogs/checkout/:id
  checkOut: async (id, notes) => {
    const response = await fetch(`${API_URL}/checklogs/checkout/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ notes })
    });
    return response.json();
  },

  getCurrent: async () => {
    const response = await fetch(`${API_URL}/checklogs/current`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_URL}/checklogs/stats`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  getVisitorHistory: async (visitorId) => {
    const response = await fetch(`${API_URL}/checklogs/visitor/${visitorId}`, {
      headers: getAuthHeaders()
    });
    return response.json();
  }
};

// Users API (Admin)
export const usersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/auth/users`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Public: get hosts (employees + admins) for appointment selection
  getHosts: async () => {
    const response = await fetch(`${API_URL}/auth/hosts`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Create user (admin only)
  create: async (userData) => {
    const response = await fetch(`${API_URL}/auth/create-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    return response.json();
  },

  // corrected path and method: PUT /auth/users/:id/role
  updateRole: async (userId, role, isActive) => {
    const response = await fetch(`${API_URL}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role, isActive })
    });
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_URL}/auth/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },
};

// Auth (self) API
export const authAPI = {
  getProfile: async () => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  updateProfile: async (data) => {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }
};
