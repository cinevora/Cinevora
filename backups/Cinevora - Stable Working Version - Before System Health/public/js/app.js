import { API } from './api.js';
import { setupSearch } from './search.js';
import { authState } from './auth.js';

export function createAnimeCard(anime) {
  return `
    <a href="/details.html?id=${anime.id}" class="anime-card">
      <div class="card-poster-wrapper">
        <img src="${anime.poster}" alt="${anime.title}" class="card-poster" loading="lazy">
        <div class="card-rating-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${anime.rating}
        </div>
        <div class="card-overlay">
          <div class="card-play-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${anime.title}</div>
        <div class="card-meta">
          <span class="badge badge-purple">${anime.type}</span>
          <span>${anime.year}</span>
        </div>
      </div>
    </a>
  `;
}

export function openTrailerModal(title, trailerUrl) {
  const existing = document.getElementById('trailer-modal');
  if (existing) existing.remove();

  const modalHTML = `
    <div id="trailer-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1.5rem;">
      <div style="position: relative; width: 100%; max-width: 900px; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid var(--border-glass);">
        <button id="close-trailer" style="position: absolute; top: 10px; right: 15px; z-index: 10; background: rgba(0,0,0,0.7); border: none; color: #fff; font-size: 1.5rem; cursor: pointer; padding: 0.2rem 0.6rem; border-radius: 6px;">✕</button>
        <video src="${trailerUrl}" controls autoplay style="width: 100%; height: 100%; object-fit: contain;"></video>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('close-trailer').addEventListener('click', () => {
    document.getElementById('trailer-modal').remove();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupSearch();

  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  setupMobileDrawer();
});

function setupMobileDrawer() {
  const toggleButtons = document.querySelectorAll('.mobile-toggle');
  if (!toggleButtons.length) return;

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      let drawer = document.getElementById('mobile-nav-drawer');
      if (!drawer) {
        const isUserLoggedIn = authState.currentUser;
        const isAdmin = isUserLoggedIn && (authState.currentUser.role === 'SUPER_ADMIN' || authState.currentUser.role === 'EDITOR');

        const drawerHTML = `
          <div id="mobile-nav-drawer" class="mobile-drawer-overlay">
            <div class="mobile-drawer-content">
              <div class="mobile-drawer-header">
                <a href="/" class="brand-logo">
                  <div class="brand-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  CINE<span>VORA</span>
                </a>
                <button id="close-mobile-drawer" class="mobile-drawer-close">✕</button>
              </div>
              <div class="mobile-drawer-body">
                <nav class="mobile-drawer-nav">
                  <a href="/" class="mobile-nav-link">Home</a>
                  <a href="/anime.html" class="mobile-nav-link">Anime Library</a>
                  <a href="/movies.html" class="mobile-nav-link">Movies</a>
                  <a href="/series.html" class="mobile-nav-link">Series</a>
                  <a href="/search.html" class="mobile-nav-link">Search</a>
                </nav>
                <div class="mobile-drawer-divider"></div>
                <div id="mobile-drawer-user-actions">
                  ${isAdmin ? `<a href="/admin/admin.html" class="btn btn-primary" style="width:100%; margin-bottom:0.75rem;">Admin Dashboard</a>` : ''}
                  ${isUserLoggedIn ? `
                    <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem; padding:0.6rem; background:rgba(255,255,255,0.05); border-radius:10px;">
                      <img src="${authState.currentUser.avatar}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid var(--accent-purple);">
                      <div style="overflow:hidden;">
                        <div style="font-weight:700; color:#fff; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${authState.currentUser.username}</div>
                        <div style="font-size:0.75rem; color:#94a3b8;">${authState.currentUser.role}</div>
                      </div>
                    </div>
                    <a href="/login.html#profile" class="btn btn-glass" style="width:100%; margin-bottom:0.5rem; justify-content:center;">My Profile & Favorites</a>
                    <button id="mobile-logout-btn" class="btn btn-glass" style="width:100%; color:#ef4444; border-color:rgba(239,68,68,0.3); justify-content:center;">Logout</button>
                  ` : `
                    <a href="/login.html" class="btn btn-primary" style="width:100%; justify-content:center;">Sign In / Register</a>
                  `}
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.insertAdjacentHTML('beforeend', drawerHTML);

        drawer = document.getElementById('mobile-nav-drawer');

        const closeBtn = document.getElementById('close-mobile-drawer');
        closeBtn?.addEventListener('click', () => {
          drawer?.classList.remove('active');
        });

        drawer?.addEventListener('click', (e) => {
          if (e.target === drawer) {
            drawer.classList.remove('active');
          }
        });

        const logoutBtn = document.getElementById('mobile-logout-btn');
        logoutBtn?.addEventListener('click', async () => {
          await API.logout();
          window.location.reload();
        });
      }

      drawer?.classList.add('active');
    });
  });
}
