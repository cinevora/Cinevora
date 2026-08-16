import { API } from './api.js';

export const CinevoraAds = {
  async renderSlot(containerEl, slotName) {
    if (!containerEl || !slotName) return;
    if (containerEl.getAttribute('data-ad-initialized') === 'true') return;
    containerEl.setAttribute('data-ad-initialized', 'true');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const animeId = containerEl.getAttribute('data-anime-id') || urlParams.get('id') || urlParams.get('anime_id');
      const episodeId = containerEl.getAttribute('data-episode-id') || urlParams.get('episode') || urlParams.get('ep') || urlParams.get('episode_id');

      const data = await API.getAdsForSlot(slotName, animeId, episodeId);
      if (!data || !data.ads || data.ads.length === 0) {
        containerEl.style.display = 'none';
        return;
      }

      // Filter frequency
      const pageViewCount = Number(sessionStorage.getItem('cinevora_page_views') || '1');

      const validAds = data.ads.filter(ad => {
        if (ad.frequency === 'SESSION') {
          const shown = sessionStorage.getItem(`ad_shown_${ad.id}`);
          if (shown) return false;
        }
        if (ad.frequency === 'EVERY_X_PAGE_VIEWS' && ad.frequency_value && ad.frequency_value > 1) {
          if (pageViewCount % ad.frequency_value !== 0) return false;
        }
        return true;
      });

      const adsToRender = validAds.length > 0 ? validAds : data.ads;
      if (!adsToRender || adsToRender.length === 0) {
        containerEl.style.display = 'none';
        return;
      }

      // Clear container and setup ad wrapper
      containerEl.style.display = 'block';
      containerEl.classList.add('cinevora-ad-wrapper');
      containerEl.innerHTML = '';

      for (const activeAd of adsToRender) {
        // Mark session shown
        if (activeAd.frequency === 'SESSION') {
          sessionStorage.setItem(`ad_shown_${activeAd.id}`, 'true');
        }

        // Record impression
        API.recordAdImpression(activeAd.id).catch(() => {});

        const adBox = document.createElement('div');
        adBox.className = 'cinevora-ad-box glass-panel';
        adBox.style.cssText = `
          position: relative;
          margin: 1.25rem 0;
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.6);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          max-width: 100%;
          text-align: center;
        `;

        // Sponsor Badge
        const badge = document.createElement('div');
        badge.style.cssText = `
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          margin-bottom: 0.75rem;
          border: 1px solid rgba(255,255,255,0.05);
        `;
        badge.innerText = 'ADVERTISEMENT';
        adBox.appendChild(badge);

        const contentBox = document.createElement('div');
        contentBox.style.cssText = 'width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;';

        const handleAdClick = () => {
          API.recordAdClick(activeAd.id).catch(() => {});
        };

        const hasCode = activeAd.code && activeAd.code.trim().length > 0;
        const isHtmlEmbed = activeAd.type === 'HTML' || activeAd.type === 'CUSTOM_EMBED';

        if (hasCode || isHtmlEmbed) {
          const iframe = document.createElement('iframe');
          iframe.sandbox = 'allow-scripts allow-popups allow-forms allow-same-origin';
          iframe.style.cssText = 'width: 100%; min-height: 80px; border: none; border-radius: 8px; background: transparent;';

          iframe.srcdoc = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { margin: 0; padding: 0; background: transparent; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 80px; }
                a { color: #38bdf8; text-decoration: none; }
                img { max-width: 100%; height: auto; border-radius: 8px; }
              </style>
            </head>
            <body>
              ${activeAd.code || ''}
              <script>
                function sendHeight() {
                  var h = document.body.scrollHeight || document.documentElement.scrollHeight;
                  if (h > 0) {
                    window.parent.postMessage({ type: 'CINEVORA_AD_RESIZE', height: h, adId: '${activeAd.id}' }, '*');
                  }
                }
                window.addEventListener('load', sendHeight);
                window.addEventListener('resize', sendHeight);
                setTimeout(sendHeight, 50);
                setTimeout(sendHeight, 300);

                document.addEventListener('click', function() {
                  window.parent.postMessage({ type: 'CINEVORA_AD_CLICK', adId: '${activeAd.id}' }, '*');
                });
              </script>
            </body>
            </html>
          `;

          const resizeHandler = (event) => {
            if (event.data && event.data.type === 'CINEVORA_AD_RESIZE' && event.data.adId === activeAd.id) {
              if (event.data.height > 0) {
                iframe.style.height = (event.data.height + 8) + 'px';
              }
            }
            if (event.data && event.data.type === 'CINEVORA_AD_CLICK' && event.data.adId === activeAd.id) {
              handleAdClick();
            }
          };
          window.addEventListener('message', resizeHandler);

          contentBox.appendChild(iframe);
        } else {
          const link = document.createElement('a');
          link.href = activeAd.target_url || '#';
          link.target = '_blank';
          link.rel = 'noopener noreferrer nofollow';
          link.style.cssText = 'text-decoration: none; color: inherit; display: block; width: 100%;';
          link.addEventListener('click', handleAdClick);

          let innerHTML = '';
          const hasImage = activeAd.image_url && activeAd.image_url.trim().length > 0;
          const hasTitle = activeAd.title && activeAd.title.trim().length > 0;
          const hasDesc = activeAd.description && activeAd.description.trim().length > 0;

          if (hasImage) {
            innerHTML += `<img src="${activeAd.image_url}" alt="${activeAd.name || activeAd.title || 'Advertisement'}" style="max-width: 100%; width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem; display: block;" />`;
          }
          if (hasTitle) {
            innerHTML += `<h4 style="margin: 0.5rem 0 0.25rem 0; font-size: 1.15rem; font-weight: 700; color: #f8fafc;">${activeAd.title}</h4>`;
          }
          if (hasDesc) {
            innerHTML += `<p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #94a3b8; max-width: 650px; margin-left: auto; margin-right: auto;">${activeAd.description}</p>`;
          }

          if (!hasImage && !hasTitle && !hasDesc) {
            let domainName = '';
            try {
              if (activeAd.target_url) {
                const parsedUrl = new URL(activeAd.target_url);
                domainName = parsedUrl.hostname.replace('www.', '');
              }
            } catch (e) {
              domainName = activeAd.target_url || '';
            }

            innerHTML += `
              <div style="padding: 1.25rem 1rem; background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(124, 58, 237, 0.15)); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; text-align: center; width: 100%; box-sizing: border-box;">
                <div style="font-size: 1.15rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.35rem;">${activeAd.name || 'Sponsored Link'}</div>
                ${domainName ? `<div style="font-size: 0.85rem; color: #38bdf8; margin-bottom: 0.75rem; word-break: break-all;">${domainName}</div>` : ''}
                <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.55rem 1.25rem; background: #38bdf8; color: #0f172a; font-weight: 700; font-size: 0.9rem; border-radius: 8px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);">
                  <span>Visit Sponsor Site</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </div>
              </div>
            `;
          }

          link.innerHTML = innerHTML;
          contentBox.appendChild(link);
        }

        adBox.appendChild(contentBox);
        containerEl.appendChild(adBox);
      }
    } catch (err) {
      console.warn('Failed to load ad slot:', slotName, err);
      containerEl.style.display = 'none';
    }
  },

  async initAllSlots() {
    const slots = document.querySelectorAll('[data-ad-slot]');
    for (const slotEl of slots) {
      const slotName = slotEl.getAttribute('data-ad-slot');
      if (slotName && slotEl.getAttribute('data-ad-initialized') !== 'true') {
        await this.renderSlot(slotEl, slotName);
      }
    }
  }
};

// Initialize and setup observers
if (typeof window !== 'undefined') {
  window.CinevoraAds = CinevoraAds;

  try {
    const currentCount = Number(sessionStorage.getItem('cinevora_page_views') || '0');
    sessionStorage.setItem('cinevora_page_views', (currentCount + 1).toString());
  } catch (e) {}

  const init = () => {
    CinevoraAds.initAllSlots();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Observe DOM changes for dynamically injected ad slots
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      const uninitialized = document.querySelectorAll('[data-ad-slot]:not([data-ad-initialized="true"])');
      if (uninitialized.length > 0) {
        CinevoraAds.initAllSlots();
      }
    });

    const startObserver = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    };

    if (document.body) {
      startObserver();
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserver);
    }
  }
}

