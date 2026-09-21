const BASE_URL = '/api';

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

  // Public TV player
  getTvPublic: (slug) => request(`/tvs/public/${slug}`),
};
