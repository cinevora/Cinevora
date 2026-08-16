import re

with open('public/watch.html', 'r') as f:
    content = f.read()

# We need to replace everything from "let showQualitySelection = false;" 
# up to but not including "if (episodes && episodes.length > 1 && activeEpisode) {"
# with our new simplified layout that NEVER renders a player.

new_logic = """
        let hasQualities = activeEpisode && activeEpisode.qualities && activeEpisode.qualities.length > 0;
        let qualitiesHtml = '';
        
        if (hasQualities) {
          qualitiesHtml = activeEpisode.qualities.map((q, idx) => `
            <div class="quality-card ${idx === 0 ? 'selected' : ''}" data-qidx="${idx}" data-qid="${q.id}" data-qname="${q.quality}" style="background: rgba(0,0,0,0.3); border: 2px solid ${idx === 0 ? '#a855f7' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s ease;">
              <div style="font-size: 1.1rem; font-weight: 800; color: ${idx === 0 ? '#a855f7' : '#f8fafc'};">${q.quality}</div>
            </div>
          `).join('');
        } else {
          // Fallback if no qualities exist but we have legacy video URL
          let legacyUrl = (activeEpisode ? activeEpisode.video_url : null) || anime.video_url;
          if (legacyUrl) {
            qualitiesHtml = `
              <div class="quality-card selected" data-qidx="0" data-qid="legacy" data-qname="Standard" style="background: rgba(0,0,0,0.3); border: 2px solid #a855f7; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s ease;">
                <div style="font-size: 1.1rem; font-weight: 800; color: #a855f7;">Standard</div>
              </div>
            `;
          }
        }

        let playerHtml = `
          <div style="padding: 2rem; max-width: 600px; margin: 0 auto; min-height: 400px; display: flex; flex-direction: column; align-items: center;">
            <h2 style="font-size: 1.5rem; font-weight: 800; text-align: center; margin-bottom: 1.5rem; color: #f8fafc;">SELECT QUALITY & LINK</h2>
            <div id="quality-selector-list" style="width: 100%; display: flex; flex-direction: row; justify-content: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
              ${qualitiesHtml || '<div style="color: #ef4444; font-weight: 700;">No sources available for this episode.</div>'}
            </div>
            
            <div id="selected-quality-details" style="width: 100%; text-align: center; margin-bottom: 1.5rem;">
               <!-- Populated by JS -->
            </div>
          </div>
        `;

        try {
          await API.recordHistory(anime.id, activeEpisode ? activeEpisode.id : undefined, 0);
        } catch {}

        container.innerHTML = `
          <!-- Ad Slot WATCH_TOP -->
          <div data-ad-slot="WATCH_TOP"></div>

          <!-- Custom Player Shell -->
          <div class="player-container">
            <div class="video-wrapper" style="background: transparent; box-shadow: none;">
              ${playerHtml}
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; flex-wrap: wrap; gap: 1rem;">
             <div>
               <h1 style="font-size: 1.5rem; font-weight: 800; color: #f8fafc; margin-bottom: 0.25rem;">${anime.title}</h1>
               <div style="color: #a855f7; font-weight: 700; font-size: 1.1rem;">
                 ${activeEpisode ? (activeEpisode.season_number ? `Season ${activeEpisode.season_number} ` : '') + `Episode ${activeEpisode.episode_number}` : ''}
               </div>
             </div>
             ${episodes && episodes.length > 1 ? `
               <div class="ep-nav" style="display: flex; gap: 0.75rem;">
                 <button id="prev-ep-btn" class="btn btn-glass" style="font-weight: 700; font-size: 0.9rem; padding: 0.5rem 1.25rem;">
                   &larr; PREV EPISODE
                 </button>
                 <button id="next-ep-btn" class="btn btn-glass" style="font-weight: 700; font-size: 0.9rem; padding: 0.5rem 1.25rem;">
                   NEXT EPISODE &rarr;
                 </button>
               </div>
             ` : ''}
          </div>

          <div class="glass-panel" style="margin-top: 2rem; padding: 1.5rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.75rem;">Synopsis</h3>
            <p style="color: #94a3b8; line-height: 1.6; font-size: 0.95rem;">${activeEpisode && activeEpisode.description ? activeEpisode.description : anime.description}</p>
          </div>
          
          ${related && related.length > 0 ? `
            <div style="margin-top: 3rem;">
              <h3 style="font-size: 1.25rem; font-weight: 800; color: #f8fafc; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <span style="color: #a855f7;">//</span> You Might Also Like
              </h3>
              <div class="grid" id="related-grid"></div>
            </div>
          ` : ''}
        `;

        if (related && related.length > 0) {
          const rg = document.getElementById('related-grid');
          related.slice(0, 4).forEach(rel => {
            rg.appendChild(createAnimeCard(rel));
          });
        }
        
        const cards = document.querySelectorAll('.quality-card');
        const detailsContainer = document.getElementById('selected-quality-details');
        
        if (cards.length > 0) {
          const renderSelectedQuality = (qIndex) => {
            let qName, codec = '', size = '', mirrorsHtml = '';
            
            if (hasQualities) {
               const q = activeEpisode.qualities[qIndex];
               qName = q.quality;
               codec = q.codec ? ` ${q.codec}` : '';
               size = q.size ? ` [Size: ${q.size}]` : '';
               
               if (q.mirrors && q.mirrors.length > 0) {
                 mirrorsHtml = q.mirrors.map(m => `
                   <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}&q=${q.id}&m=${m.id}" class="btn btn-glass" style="font-weight: 700; padding: 0.6rem 1.2rem; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
                     ${m.name}
                   </a>
                 `).join('');
               } else if (q.video_url) {
                 mirrorsHtml = `
                   <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}&q=${q.id}" class="btn btn-glass" style="font-weight: 700; padding: 0.6rem 1.2rem; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
                     Google Drive
                   </a>
                 `;
               }
            } else {
               qName = 'Standard';
               let legacyUrl = (activeEpisode ? activeEpisode.video_url : null) || anime.video_url;
               if (legacyUrl) {
                 mirrorsHtml = `
                   <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}" class="btn btn-glass" style="font-weight: 700; padding: 0.6rem 1.2rem; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
                     Google Drive
                   </a>
                 `;
               }
            }
            
            detailsContainer.innerHTML = `
              <div style="font-size: 1.2rem; color: #f8fafc; font-weight: 800; margin-bottom: 1.5rem;">
                ${qName}${codec}${size}
              </div>
              <div style="font-size: 1rem; color: #94a3b8; font-weight: 700; margin-bottom: 1rem;">
                Download / Mirror Links:
              </div>
              <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                ${mirrorsHtml || '<span style="color:#ef4444; font-size:0.9rem;">No mirrors available</span>'}
              </div>
            `;
          };
          
          renderSelectedQuality(0);
          
          cards.forEach(c => {
            c.addEventListener('click', () => {
              cards.forEach(oc => {
                oc.classList.remove('selected');
                oc.style.borderColor = 'rgba(255,255,255,0.1)';
                oc.querySelector('div').style.color = '#f8fafc';
              });
              c.classList.add('selected');
              c.style.borderColor = '#a855f7';
              c.querySelector('div').style.color = '#a855f7';
              
              const qidx = parseInt(c.getAttribute('data-qidx'));
              renderSelectedQuality(qidx);
            });
          });
        }
"""

content = re.sub(r'let showQualitySelection = false;.*?(?=\/\/ Episode Next \/ Prev Handlers)', new_logic + '\n        ', content, flags=re.DOTALL)

with open('public/watch.html', 'w') as f:
    f.write(content)
print("Patched watch.html to remove player")
