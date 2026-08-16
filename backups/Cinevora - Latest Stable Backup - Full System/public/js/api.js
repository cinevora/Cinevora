/**
 * CINEVORA API CLIENT
 * Handles requests, session credentials, headers, and global error handling
 */

const API_BASE = '/api';

let sessionToken = '';
try {
  if (typeof sessionStorage !== 'undefined') sessionToken = sessionStorage.getItem('cinevora_token') || '';
  if (!sessionToken && typeof localStorage !== 'undefined') sessionToken = localStorage.getItem('cinevora_token') || '';
} catch (e) {
  sessionToken = '';
}

function setToken(token) {
  sessionToken = token || '';
  try {
    if (token) {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('cinevora_token', token);
      if (typeof localStorage !== 'undefined') localStorage.setItem('cinevora_token', token);
    } else {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('cinevora_token');
      if (typeof localStorage !== 'undefined') localStorage.removeItem('cinevora_token');
    }
  } catch (e) {}
}

function getHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  return headers;
}

async function parseJsonResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return { error: `Invalid JSON format received from server (${res.status}).` };
    }
  }
  if (res.status === 503 || res.status === 502 || res.status === 504) {
    return { error: `Backend server is unavailable (${res.status}). Please check server connection.` };
  }
  return { error: `Server error (${res.status}). Expected JSON response.` };
}

export const API = {
  // --- Auth ---
  async me() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    const data = await parseJsonResponse(res);
    if (res.status === 401) {
      setToken('');
    }
    return data;
  },

  async getMe() {
    return this.me();
  },

  async getCurrentUser() {
    return this.me();
  },

  async login(emailOrUsername, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ emailOrUsername, password })
    });
    const data = await parseJsonResponse(res);
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  async register(username, email, password) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ username, email, password })
    });
    const data = await parseJsonResponse(res);
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  async adminLogin(email, password) {
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await parseJsonResponse(res);
      if (data && data.token) {
        setToken(data.token);
      }
      return data;
    } catch (err) {
      return { error: 'Backend server is unavailable (503). Please check server connection.' };
    }
  },

  async adminLogout() {
    const res = await fetch(`${API_BASE}/auth/admin-logout`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    setToken('');
    return parseJsonResponse(res);
  },

  async logout() {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    setToken('');
    return parseJsonResponse(res);
  },

  // --- Anime / Content ---
  async getAnime(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/anime?${query}`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  async getAnimeById(id) {
    const res = await fetch(`${API_BASE}/anime/${id}`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  async search(q) {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  // --- Watchlist / Favorites / History ---
  async getWatchlist() {
    const res = await fetch(`${API_BASE}/user/watchlist`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async toggleWatchlist(animeId) {
    const res = await fetch(`${API_BASE}/user/watchlist/toggle`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ animeId })
    });
    return parseJsonResponse(res);
  },

  async getFavorites() {
    const res = await fetch(`${API_BASE}/user/favorites`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async toggleFavorite(animeId) {
    const res = await fetch(`${API_BASE}/user/favorites/toggle`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ animeId })
    });
    return parseJsonResponse(res);
  },

  async recordHistory(animeId, episodeId, progressSeconds = 0) {
    const res = await fetch(`${API_BASE}/user/history/record`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ animeId, episodeId, progressSeconds })
    });
    return parseJsonResponse(res);
  },

  async getHistory() {
    const res = await fetch(`${API_BASE}/user/history`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  // --- Admin API ---
  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async getAdminLogs() {
    const res = await fetch(`${API_BASE}/admin/logs`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async getAuditLogs() {
    return this.getAdminLogs();
  },

  async createAnime(animeData) {
    const res = await fetch(`${API_BASE}/admin/anime`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(animeData)
    });
    return parseJsonResponse(res);
  },

  async addAnime(animeData) {
    return this.createAnime(animeData);
  },

  async updateAnime(id, animeData) {
    const res = await fetch(`${API_BASE}/admin/anime/${id}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(animeData)
    });
    return parseJsonResponse(res);
  },

  async deleteAnime(id) {
    const res = await fetch(`${API_BASE}/admin/anime/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async addEpisode(episodeData) {
    const res = await fetch(`${API_BASE}/admin/episodes`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(episodeData)
    });
    return parseJsonResponse(res);
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async updateUserStatus(userId, status) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    return parseJsonResponse(res);
  },

  async toggleUserStatus(userId, status) {
    return this.updateUserStatus(userId, status);
  },

  async updateSettings(settingsData) {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(settingsData)
    });
    return parseJsonResponse(res);
  },

  // --- Ads API ---
  async getAdsForSlot(slot, animeId, episodeId) {
    let url = `${API_BASE}/ads?slot=${encodeURIComponent(slot)}`;
    if (animeId) url += `&anime_id=${encodeURIComponent(animeId)}`;
    if (episodeId) url += `&episode_id=${encodeURIComponent(episodeId)}`;
    const res = await fetch(url);
    return parseJsonResponse(res);
  },

  async recordAdImpression(adId) {
    const res = await fetch(`${API_BASE}/ads/${adId}/impression`, { method: 'POST' });
    return parseJsonResponse(res);
  },

  async recordAdClick(adId) {
    const res = await fetch(`${API_BASE}/ads/${adId}/click`, { method: 'POST' });
    return parseJsonResponse(res);
  },

  async getAdminAds() {
    const res = await fetch(`${API_BASE}/admin/ads`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async createAd(adData) {
    const res = await fetch(`${API_BASE}/admin/ads`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(adData)
    });
    return parseJsonResponse(res);
  },

  async updateAd(adId, adData) {
    const res = await fetch(`${API_BASE}/admin/ads/${adId}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(adData)
    });
    return parseJsonResponse(res);
  },

  async deleteAd(adId) {
    const res = await fetch(`${API_BASE}/admin/ads/${adId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async toggleAd(adId) {
    const res = await fetch(`${API_BASE}/admin/ads/${adId}/toggle`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async duplicateAd(adId) {
    const res = await fetch(`${API_BASE}/admin/ads/${adId}/duplicate`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async getAdSlots() {
    const res = await fetch(`${API_BASE}/admin/ads/slots`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async updateAdSlots(slots) {
    const res = await fetch(`${API_BASE}/admin/ads/slots`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ slots })
    });
    return parseJsonResponse(res);
  },

  async getAdSettings() {
    const res = await fetch(`${API_BASE}/admin/ads/settings`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async updateAdSettings(settings) {
    const res = await fetch(`${API_BASE}/admin/ads/settings`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(settings)
    });
    return parseJsonResponse(res);
  },

  
  // --- Comments ---
  async getComments(animeId) {
    const res = await fetch(`${API_BASE}/anime/${animeId}/comments`, { headers: getHeaders() });
    return parseJsonResponse(res);
  },
  async postComment(animeId, username, content) {
    const res = await fetch(`${API_BASE}/anime/${animeId}/comments`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, content })
    });
    return parseJsonResponse(res);
  },
  
  async getAdminComments() {
    const res = await fetch(`${API_BASE}/admin/comments`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },
  async deleteComment(commentId) {
    const res = await fetch(`${API_BASE}/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },
  
  // --- Download Links & Episode Links ---
  async getDownloadLinks(contentId) {
    const res = await fetch(`${API_BASE}/content/${contentId}/download-links`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  async getAdminDownloadLinks(contentId) {
    const res = await fetch(`${API_BASE}/admin/content/${contentId}/download-links`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async saveDownloadLinks(contentId, links) {
    const res = await fetch(`${API_BASE}/content/${contentId}/download-links`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ links })
    });
    return parseJsonResponse(res);
  },

  async updateDownloadLink(linkId, linkData) {
    const res = await fetch(`${API_BASE}/download-links/${linkId}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(linkData)
    });
    return parseJsonResponse(res);
  },

  async deleteDownloadLink(linkId) {
    const res = await fetch(`${API_BASE}/download-links/${linkId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  // --- Episode Operations ---
  async getEpisodeById(id) {
    const res = await fetch(`${API_BASE}/episodes/${id}`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  async addEpisode(episodeData) {
    const res = await fetch(`${API_BASE}/admin/episodes`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(episodeData)
    });
    return parseJsonResponse(res);
  },

  async updateEpisode(id, episodeData) {
    const res = await fetch(`${API_BASE}/admin/episodes/${id}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(episodeData)
    });
    return parseJsonResponse(res);
  },

  async deleteEpisode(id) {
    const res = await fetch(`${API_BASE}/admin/episodes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async reorderEpisodes(animeId, episodeIds) {
    const res = await fetch(`${API_BASE}/admin/episodes/reorder`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ anime_id: animeId, episode_ids: episodeIds })
    });
    return parseJsonResponse(res);
  },

  async getEpisodeDownloadLinks(episodeId) {
    const res = await fetch(`${API_BASE}/episodes/${episodeId}/download-links`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  async getAdminEpisodeDownloadLinks(episodeId) {
    const res = await fetch(`${API_BASE}/admin/episodes/${episodeId}/download-links`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async saveEpisodeDownloadLinks(episodeId, links) {
    const res = await fetch(`${API_BASE}/episodes/${episodeId}/download-links`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ links })
    });
    return parseJsonResponse(res);
  },

  // --- Admin Content Get / Update ---
  async getAdminAnimeById(id) {
    const res = await fetch(`${API_BASE}/admin/anime/${id}`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async updateAnime(id, data) {
    const res = await fetch(`${API_BASE}/admin/anime/${id}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return parseJsonResponse(res);
  },

  // --- Page Settings ---
  async getPageSettings() {
    const res = await fetch(`${API_BASE}/page-settings`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  async getAdminPageSettings() {
    const res = await fetch(`${API_BASE}/admin/page-settings`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async updatePageSettings(settings) {
    const res = await fetch(`${API_BASE}/admin/page-settings`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(settings)
    });
    return parseJsonResponse(res);
  },

  // --- Screenshots Gallery ---
  async getAnimeScreenshots(animeId) {
    const res = await fetch(`${API_BASE}/anime/${animeId}/screenshots`, {
      headers: getHeaders()
    });
    return parseJsonResponse(res);
  },

  async getAdminAnimeScreenshots(animeId) {
    const res = await fetch(`${API_BASE}/admin/anime/${animeId}/screenshots`, {
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async addAnimeScreenshot(animeId, data) {
    const res = await fetch(`${API_BASE}/admin/anime/${animeId}/screenshots`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return parseJsonResponse(res);
  },

  async updateAnimeScreenshot(animeId, screenshotId, data) {
    const res = await fetch(`${API_BASE}/admin/anime/${animeId}/screenshots/${screenshotId}`, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return parseJsonResponse(res);
  },

  async deleteAnimeScreenshot(animeId, screenshotId) {
    const res = await fetch(`${API_BASE}/admin/anime/${animeId}/screenshots/${screenshotId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include'
    });
    return parseJsonResponse(res);
  },

  async reorderAnimeScreenshots(animeId, orderedIds) {
    const res = await fetch(`${API_BASE}/admin/anime/${animeId}/screenshots/reorder`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ ordered_ids: orderedIds })
    });
    return parseJsonResponse(res);
  },

  // System Health & Protection API
  async getHealthSummary() {
    const res = await fetch(`${API_BASE}/admin/health/summary`, { headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  },

  async controlFeature(featureId, action) {
    const res = await fetch(`${API_BASE}/admin/health/features/${featureId}/control`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ action })
    });
    return parseJsonResponse(res);
  },

  async getHealthErrors(status = '', feature = '') {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (feature) params.append('feature', feature);
    const res = await fetch(`${API_BASE}/admin/health/errors?${params.toString()}`, { headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  },

  async updateErrorStatus(errorId, status) {
    const res = await fetch(`${API_BASE}/admin/health/errors/${errorId}/status`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    return parseJsonResponse(res);
  },

  async getBrokenLinks() {
    const res = await fetch(`${API_BASE}/admin/health/broken-links`, { headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  },

  async scanBrokenLinks() {
    const res = await fetch(`${API_BASE}/admin/health/broken-links/scan`, { method: 'POST', headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  },

  async getAlerts() {
    const res = await fetch(`${API_BASE}/admin/health/alerts`, { headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  },

  async markAlert(alertId, action) {
    const res = await fetch(`${API_BASE}/admin/health/alerts/${alertId}/action`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ action })
    });
    return parseJsonResponse(res);
  },

  async getRecoveryHistory() {
    const res = await fetch(`${API_BASE}/admin/health/recovery-history`, { headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  },

  async getSystemLogs(search = '', level = '', feature = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (level) params.append('level', level);
    if (feature) params.append('feature', feature);
    const res = await fetch(`${API_BASE}/admin/health/logs?${params.toString()}`, { headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  },

  async runHealthCheckNow() {
    const res = await fetch(`${API_BASE}/admin/health/check-now`, { method: 'POST', headers: getHeaders(), credentials: 'include' });
    return parseJsonResponse(res);
  }
};
