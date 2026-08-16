import { API } from './api.js';

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      const data = await API.me();
      if (data.authenticated && data.user) {
        this.currentUser = data.user;
      }
    } catch (e) {
      console.warn('Auth check failed:', e);
    }
    this.updateHeaderUI();
  }

  updateHeaderUI() {
    const userContainer = document.getElementById('header-user-actions');
    if (!userContainer) return;

    if (this.currentUser) {
      const isAdmin = this.currentUser.role === 'SUPER_ADMIN' || this.currentUser.role === 'EDITOR';
      userContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${isAdmin ? `<a href="/admin/admin.html" class="btn btn-glass" style="padding: 0.45rem 0.85rem; font-size: 0.8rem; border-color: var(--accent-purple);">Admin Dashboard</a>` : ''}
          <div style="position: relative;" class="user-menu-wrapper">
            <button id="user-profile-btn" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; color: #fff;">
              <img src="${this.currentUser.avatar}" alt="${this.currentUser.username}" style="width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--accent-purple); object-fit: cover;">
              <span style="font-weight: 600; font-size: 0.9rem;">${this.currentUser.username}</span>
            </button>
            <div id="user-dropdown" class="glass-panel" style="display: none; position: absolute; right: 0; top: 120%; width: 180px; padding: 0.5rem; border-radius: 12px; z-index: 200;">
              <a href="/login.html#profile" style="display: block; padding: 0.6rem 0.8rem; color: var(--text-main); text-decoration: none; font-size: 0.85rem; border-radius: 6px;">My Watchlist</a>
              <a href="/login.html#profile" style="display: block; padding: 0.6rem 0.8rem; color: var(--text-main); text-decoration: none; font-size: 0.85rem; border-radius: 6px;">Favorites</a>
              <button id="logout-btn" style="width: 100%; text-align: left; background: none; border: none; padding: 0.6rem 0.8rem; color: #ef4444; font-size: 0.85rem; cursor: pointer; border-radius: 6px;">Logout</button>
            </div>
          </div>
        </div>
      `;

      const menuBtn = document.getElementById('user-profile-btn');
      const dropdown = document.getElementById('user-dropdown');
      const logoutBtn = document.getElementById('logout-btn');

      if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', () => {
          dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        });
      }

      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          await API.logout();
          window.location.reload();
        });
      }
    } else {
      userContainer.innerHTML = `
        <a href="/login.html" class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Sign In
        </a>
      `;
    }
  }
}

export const authState = new AuthManager();
