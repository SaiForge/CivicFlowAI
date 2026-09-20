/**
 * CivicFlowAI — API Client
 * All backend calls go through this file.
 * Base URL is controlled by VITE_API_URL env var.
 * JWT token is stored in localStorage under 'civicflow_token'.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// ── Token helpers ─────────────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem('civicflow_token');
export const setToken = (t) => localStorage.setItem('civicflow_token', t);
export const clearToken = () => localStorage.removeItem('civicflow_token');

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    const err = new Error(errorBody.detail || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  // Some endpoints return 204 no-content
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password, ward, role = 'citizen') =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, ward, role }),
    }),

  me: () => apiFetch('/api/auth/me'),
};

// ── Complaints ────────────────────────────────────────────────────────────────

export const complaintsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString();
    return apiFetch(`/api/complaints${qs ? '?' + qs : ''}`);
  },

  get: (id) => apiFetch(`/api/complaints/${id}`),

  submit: async (formData) => {
    // formData is a FormData object (handles multipart)
    return apiFetch('/api/complaints', {
      method: 'POST',
      body: formData,
      // No Content-Type header — fetch sets multipart/form-data automatically
    });
  },

  update: (id, payload) =>
    apiFetch(`/api/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  vote: (id, direction) =>
    apiFetch(`/api/complaints/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    }),

  getTrace: (id) => apiFetch(`/api/complaints/${id}/trace`),

  rerun: (id) =>
    apiFetch(`/api/complaints/${id}/rerun`, { method: 'POST' }),

  /** Returns a URL to display an image directly in <img src=...> */
  imageUrl: (complaintId, imageId) =>
    `${BASE_URL}/api/complaints/${complaintId}/images/${imageId}`,

  uploadResolutionImages: (complaintId, files, imageType = 'resolution_after') => {
    const fd = new FormData();
    fd.append('image_type', imageType);
    files.forEach((f) => fd.append('files', f));
    return apiFetch(`/api/complaints/${complaintId}/images`, {
      method: 'POST',
      body: fd,
    });
  },
};

// ── Incidents ─────────────────────────────────────────────────────────────────

export const incidentsApi = {
  list: () => apiFetch('/api/incidents'),
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const statsApi = {
  admin: () => apiFetch('/api/stats/admin'),
  categoryBreakdown: () => apiFetch('/api/stats/category-breakdown'),
  statusBreakdown: () => apiFetch('/api/stats/status-breakdown'),
  deptPerformance: () => apiFetch('/api/stats/dept-performance'),
  activityFeed: (limit = 20) => apiFetch(`/api/stats/activity-feed?limit=${limit}`),
  mapMarkers: () => apiFetch('/api/stats/map-markers'),
  area: () => apiFetch('/api/stats/area'),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () => apiFetch('/api/notifications'),
  markRead: (id) => apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
};
