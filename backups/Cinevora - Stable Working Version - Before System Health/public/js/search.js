import { API } from './api.js';

export function setupSearch() {
  const searchModalHTML = `
    <div id="search-modal" style="display: none; position: fixed; inset: 0; background: rgba(7,9,19,0.85); backdrop-filter: blur(20px); z-index: 999; padding: 2rem 1rem;">
      <div class="container" style="max-width: 720px; margin-top: 4rem;">
        <div style="position: relative; display: flex; align-items: center;">
          <input type="text" id="search-modal-input" placeholder="Search anime, movies, series, or genres..." style="width: 100%; background: var(--bg-card); border: 1px solid var(--accent-purple); color: #fff; padding: 1.1rem 1.5rem; font-size: 1.1rem; border-radius: 14px; outline: none; box-shadow: 0 0 20px var(--accent-purple-glow);">
          <button id="search-modal-close" style="position: absolute; right: 1rem; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.5rem;">✕</button>
        </div>
        <div id="search-modal-results" style="margin-top: 1.5rem; max-height: 60vh; overflow-y: auto;"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', searchModalHTML);

  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-modal-input');
  const resultsContainer = document.getElementById('search-modal-results');
  const closeBtn = document.getElementById('search-modal-close');

  const triggers = document.querySelectorAll('.search-trigger');
  triggers.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.style.display = 'block';
      input.focus();
    });
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  let debounceTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();

    if (!query) {
      resultsContainer.innerHTML = '';
      return;
    }

    resultsContainer.innerHTML = `<div class="state-box"><div class="spinner"></div><p style="color:var(--text-muted); font-size:0.9rem;">Searching catalog...</p></div>`;

    debounceTimer = setTimeout(async () => {
      try {
        const data = await API.search(query);
        if (data.results.length === 0) {
          resultsContainer.innerHTML = `
            <div class="glass-panel" style="padding: 2rem; text-align: center; border-radius: 12px; color: var(--text-muted);">
              No anime found matching "${query}".
            </div>
          `;
        } else {
          resultsContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              ${data.results.map(item => `
                <a href="/details.html?id=${item.id}" class="glass-panel" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border-radius: 12px; text-decoration: none; color: #fff; transition: var(--transition);">
                  <img src="${item.poster}" alt="${item.title}" style="width: 50px; height: 70px; object-fit: cover; border-radius: 6px;">
                  <div>
                    <div style="font-weight: 700; font-size: 1rem;">${item.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                      ${item.type} • ${item.year} • ⭐ ${item.rating} • ${item.genres.join(', ')}
                    </div>
                  </div>
                </a>
              `).join('')}
            </div>
          `;
        }
      } catch (err) {
        resultsContainer.innerHTML = `<div class="glass-panel" style="padding: 1.5rem; color: #ef4444; text-align: center;">Error performing search. Please try again.</div>`;
      }
    }, 300);
  });
}
