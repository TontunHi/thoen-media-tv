const BASE_URL = '/api';

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm'
];

export const MAX_UPLOAD_FILES = 10;
export const MAX_UPLOAD_FILE_BYTES = 500 * 1024 * 1024;

export function validateUploadFiles(files) {
  const list = Array.from(files || []);
  if (list.length === 0) {
    return { valid: false, error: 'กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์' };
  }
  if (list.length > MAX_UPLOAD_FILES) {
    return { valid: false, error: `อัปโหลดได้สูงสุดครั้งละ ${MAX_UPLOAD_FILES} ไฟล์` };
  }
  for (const file of list) {
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `ไฟล์ "${file.name}" ไม่รองรับ (รองรับเฉพาะ JPG, PNG, GIF, WebP, MP4, WebM)`
      };
    }
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      return {
        valid: false,
        error: `ไฟล์ "${file.name}" มีขนาดเกินกำหนด 500 MB`
      };
    }
  }
  return { valid: true, error: null };
}

export function extractVideoDuration(file) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !file || !String(file.type || '').startsWith('video/')) {
      return resolve(0);
    }
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const objectUrl = URL.createObjectURL(file);
      const timer = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      }, 3000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration) : 0;
        resolve(dur);
      };
      video.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(objectUrl);
        resolve(0);
      };
      video.src = objectUrl;
    } catch {
      resolve(0);
    }
  });
}

export function uploadMediaWithProgress(formData, onProgress) {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === 'undefined') {
      request('/media/upload', { method: 'POST', body: formData })
        .then(resolve)
        .catch(reject);
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/media/upload`, true);

    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress({ loaded: event.loaded, total: event.total, percent });
        }
      };
    }

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = {};
      }
      if (xhr.status === 401) {
        setAuthToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth_change'));
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.error || `HTTP Error ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('การเชื่อมต่อเครือข่ายล้มเหลวระหว่างอัปโหลดไฟล์'));
    };

    xhr.send(formData);
  });
}

export function getAuthToken() {
  return localStorage.getItem('token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type if sending FormData (let browser set boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If not public route
    if (!endpoint.startsWith('/tvs/public/')) {
      setAuthToken(null);
      window.dispatchEvent(new Event('auth_change'));
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP Error ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  checkAuth: () => request('/auth/me'),

  // Stats
  getStats: () => request('/stats'),

  // Folders
  getFolders: () => request('/folders'),
  createFolder: (name, parent_id) =>
    request('/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parent_id }),
    }),
  renameFolder: (id, name) =>
    request(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  deleteFolder: (id) =>
    request(`/folders/${id}`, {
      method: 'DELETE',
    }),

  // Media
  getMedia: (folder_id) =>
    request(`/media?folder_id=${folder_id !== undefined ? folder_id : 'all'}`),
  uploadMedia: (formData) =>
    request('/media/upload', {
      method: 'POST',
      body: formData,
    }),
  uploadMediaWithProgress,
  createStreamMedia: (data) =>
    request('/media/stream', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createAnnouncementMedia: (data) =>
    request('/media/announcement', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMedia: (id, data) =>
    request(`/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMedia: (id) =>
    request(`/media/${id}`, {
      method: 'DELETE',
    }),

  // Playlists
  getPlaylists: () => request('/playlists'),
  getPlaylist: (id) => request(`/playlists/${id}`),
  createPlaylist: (name, description) =>
    request('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  updatePlaylist: (id, data) =>
    request(`/playlists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePlaylist: (id) =>
    request(`/playlists/${id}`, {
      method: 'DELETE',
    }),
  addPlaylistItems: (playlistId, media_file_ids, duration_seconds) =>
    request(`/playlists/${playlistId}/items`, {
      method: 'POST',
      body: JSON.stringify({ media_file_ids, duration_seconds }),
    }),
  updatePlaylistItem: (playlistId, itemId, data) =>
    request(`/playlists/${playlistId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  reorderPlaylistItems: (playlistId, items) =>
    request(`/playlists/${playlistId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),
  deletePlaylistItem: (playlistId, itemId) =>
    request(`/playlists/${playlistId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  // TVs
  getTvs: () => request('/tvs'),
  createTv: (data) =>
    request('/tvs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTv: (id, data) =>
    request(`/tvs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTv: (id) =>
    request(`/tvs/${id}`, {
      method: 'DELETE',
    }),
  reloadTv: (id) =>
    request(`/tvs/${id}/reload`, {
      method: 'POST',
    }),
  bulkAssignTvs: (data) =>
    request('/tvs/bulk-assign', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTvLogs: (id) => request(`/tvs/${id}/logs`),

  // Users, RBAC, Audit Logs & Backup
  getUsers: () => request('/users'),
  createUser: (data) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id, data) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),
  getAuditLogs: (limit = 100) => request(`/users/audit-logs?limit=${limit}`),
  triggerDatabaseBackup: () =>
    request('/users/backup', {
      method: 'POST',
    }),
  downloadDatabaseBackup: async () => {
    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${BASE_URL}/users/backup/download`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'ดาวน์โหลดไฟล์สำรองข้อมูลไม่สำเร็จ');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `thoen-media-tv-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },

  // Public TV player
  getTvPublic: (slug) => request(`/tvs/public/${slug}`),

  // Incidents (Mass Casualty Incidents / อุบัติเหตุหมู่)
  getIncidents: () => request('/incidents'),
  getIncident: (id) => request(`/incidents/${id}`),
  createIncident: (data) =>
    request('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateIncident: (id, data) =>
    request(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteIncident: (id) =>
    request(`/incidents/${id}`, {
      method: 'DELETE',
    }),
  queryHosxpAccidentPatients: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/incidents/hosxp?${query}`);
  },
  syncHosxpToIncident: (incidentId, selectedVns, autoTagPrefix) =>
    request(`/incidents/${incidentId}/sync-hosxp`, {
      method: 'POST',
      body: JSON.stringify({ selectedVns, autoTagPrefix }),
    }),
  addIncidentPatient: (incidentId, data) =>
    request(`/incidents/${incidentId}/patients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateIncidentPatient: (incidentId, patientId, data) =>
    request(`/incidents/${incidentId}/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteIncidentPatient: (incidentId, patientId) =>
    request(`/incidents/${incidentId}/patients/${patientId}`, {
      method: 'DELETE',
    }),
  broadcastIncident: (incidentId, active, tvIds) =>
    request(`/incidents/${incidentId}/broadcast`, {
      method: 'POST',
      body: JSON.stringify({ active, tvIds }),
    }),
  triggerIncidentAutoSync: (incidentId) =>
    request(`/incidents/${incidentId}/auto-sync`, {
      method: 'POST',
    }),
  getActiveIncidentDisplay: () => request('/incidents/active/display'),
  getIncidentDisplay: (id) => request(`/incidents/display/${id}`),
  downloadIncidentExcel: async (id) => {
    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${BASE_URL}/incidents/${id}/export/excel`, { headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'ดาวน์โหลดไฟล์ Excel ไม่สำเร็จ');
    }
    const blob = await response.blob();
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'รายงานอุบัติเหตุหมู่_โรงพยาบาลเถิน.xlsx';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/);
      if (match) {
        filename = decodeURIComponent(match[1] || match[2]);
      }
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};
