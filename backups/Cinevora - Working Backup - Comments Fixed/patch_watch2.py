import re

with open('public/watch.html', 'r') as f:
    content = f.read()

new_logic = """
        let selectedQuality = null;
        if (activeEpisode && activeEpisode.qualities && activeEpisode.qualities.length > 0) {
          if (qualityId) {
            selectedQuality = activeEpisode.qualities.find(q => q.id === qualityId);
          }
        }
        
        let videoStreamUrl = selectedQuality ? selectedQuality.video_url : (activeEpisode ? activeEpisode.video_url : anime.video_url);
        let driveFileId = selectedQuality ? (selectedQuality.drive_file_id || extractDriveFileId(videoStreamUrl)) : ((activeEpisode && activeEpisode.drive_file_id) || (anime && anime.drive_file_id) || extractDriveFileId(videoStreamUrl));
        
        if (selectedQuality && !videoStreamUrl && selectedQuality.mirrors && selectedQuality.mirrors.length > 0) {
          videoStreamUrl = selectedQuality.mirrors[0].url;
          driveFileId = selectedQuality.mirrors[0].drive_file_id || extractDriveFileId(videoStreamUrl);
        }
        
        let playerHtml = '';
        let hasPlayer = false;
        
        if (qualityId && (videoStreamUrl || driveFileId)) {
          hasPlayer = true;
          if (driveFileId || extractDriveFileId(videoStreamUrl)) {
             playerHtml = `
               <div style="padding: 3rem 2rem; text-align: center; color: #f8fafc; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" style="margin-bottom: 1rem;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                 <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">Google Drive Link Selected</h2>
                 <p style="color: #94a3b8; margin-bottom: 2rem;">This video is hosted on Google Drive and cannot be played directly in the browser player.</p>
                 <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}${selectedQuality ? `&q=${selectedQuality.id}` : ''}" class="btn btn-primary" style="font-weight: 800; padding: 0.75rem 2rem;">
                   OPEN LINK / DOWNLOAD
                 </a>
               </div>
             `;
          } else if (videoStreamUrl) {
             playerHtml = `<video id="cinevora-video-player" src="${videoStreamUrl}" controls autoplay style="width:100%; height:100%; object-fit:contain;" onerror="this.outerHTML='<div class=&quot;glass-panel&quot; style=&quot;padding: 3rem 2rem; text-align: center; border-radius: 20px; color: #ef4444;&quot;><h3 style=&quot;font-size: 1.25rem; font-weight: 700;&quot;>Video stream is unavailable.</h3></div>'"></video>`;
          }
        }
        
        try {
          await API.recordHistory(anime.id, activeEpisode ? activeEpisode.id : undefined, 0);
        } catch {}
        
        let qualitiesListHtml = '';
        let watchOnlineUrl = null;
        
        if (activeEpisode && activeEpisode.qualities && activeEpisode.qualities.length > 0) {
            // Find a quality that has a direct stream for the "Watch online" link
            const streamQ = activeEpisode.qualities.find(q => q.video_url && !extractDriveFileId(q.video_url));
            if (streamQ) watchOnlineUrl = `/watch.html?id=${anime.id}&ep=${activeEpisode.id}&q=${streamQ.id}`;
            else watchOnlineUrl = `/watch.html?id=${anime.id}&ep=${activeEpisode.id}&q=${activeEpisode.qualities[0].id}`; // fallback
            
            qualitiesListHtml = activeEpisode.qualities.map(q => {
                const codec = q.codec ? ` ${q.codec}` : '';
                const size = q.size ? ` [Size: ${q.size}]` : '';
                
                let mirrorsHtml = '';
                if (q.mirrors && q.mirrors.length > 0) {
                  mirrorsHtml = q.mirrors.map((m, mIdx) => `
                    <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}&q=${q.id}&m=${m.id}" style="color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 1.05rem; white-space: nowrap;" target="_blank">
                      ${m.name}
                    </a>
                    ${mIdx < q.mirrors.length - 1 ? '<span style="color: rgba(255,255,255,0.3); margin: 0 0.4rem;">|</span>' : ''}
                  `).join('');
                } else if (q.video_url) {
                  mirrorsHtml = `
                    <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}&q=${q.id}" style="color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 1.05rem;" target="_blank">
                      Google Drive
                    </a>
                  `;
                } else {
                  mirrorsHtml = `<span style="color: #ef4444; font-size: 0.95rem;">No mirrors available</span>`;
                }
                
                return `
                  <div style="margin-bottom: 2rem; text-align: center;">
                    <div style="font-size: 1.15rem; color: #f8fafc; font-weight: 700; margin-bottom: 0.5rem;">
                      ${q.quality}${codec}${size}
                    </div>
                    <div style="display: flex; justify-content: center; flex-wrap: wrap; align-items: center; gap: 0.2rem;">
                      ${mirrorsHtml}
                    </div>
                  </div>
                `;
            }).join('');
        } else if (activeEpisode) {
            // Legacy fallback if no qualities array
            if (activeEpisode.video_url && !extractDriveFileId(activeEpisode.video_url)) {
                watchOnlineUrl = `/watch.html?id=${anime.id}&ep=${activeEpisode.id}`;
            }
        }
        
        const padEp = activeEpisode ? (activeEpisode.episode_number < 10 ? '0' + activeEpisode.episode_number : activeEpisode.episode_number) : '01';
        // Mocking upload date for visual parity, or could use created_at if exists
        const uploadDate = activeEpisode && activeEpisode.created_at ? new Date(activeEpisode.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

        container.innerHTML = `
          <!-- Ad Slot WATCH_TOP -->
          <div data-ad-slot="WATCH_TOP"></div>

          ${hasPlayer ? `
          <!-- Custom Player Shell -->
          <div class="player-container">
            <div class="video-wrapper">
              ${playerHtml}
            </div>
            
            <div class="player-controls">
              <div class="controls-left">
                <span class="badge badge-blue">${selectedQuality ? selectedQuality.quality : "HD"} Stream</span>
                <div class="now-playing-info">
                  <span style="color: var(--text-muted); font-size: 0.9rem;">PLAYING</span>
                  <strong style="color: #f8fafc; font-size: 1.1rem; display: block;">${activeEpisode.title}</strong>
                </div>
              </div>
              <div class="controls-right">
                <a href="#mirrors-section" class="btn btn-primary" style="font-weight: 800; font-size: 0.9rem; padding: 0.5rem 1rem;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download / Mirrors
                </a>
              </div>
            </div>
          </div>
          ` : ''}

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
          
          <div id="mirrors-section" class="glass-panel" style="margin-top: 2rem; padding: 2rem 1rem; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 2rem;">
              <h2 style="font-size: 1.6rem; font-weight: 500; color: #f8fafc; margin-bottom: 0.75rem; font-family: serif;">
                Episode: ${padEp}
              </h2>
              <div style="color: #ef4444; font-size: 1.05rem; font-weight: 500; margin-bottom: 2rem;">
                [Upload Date: ${uploadDate}]
              </div>
              
              ${qualitiesListHtml || '<div style="color: #94a3b8;">No mirrors configured for this episode.</div>'}
              
              <div style="margin-top: 2.5rem; font-size: 1.15rem; color: #f8fafc; font-weight: 500;">
                Watch online:- <a href="${watchOnlineUrl || '#'}" style="color: #38bdf8; text-decoration: none; font-weight: 700;">Click Here</a>
              </div>
            </div>
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
"""

start_idx = content.find("let showQualitySelection = false;")
end_idx = content.find("if (related && related.length > 0) {")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_logic + "\n        " + content[end_idx:]
    with open('public/watch.html', 'w') as f:
        f.write(content)
    print("Replaced watch.html logic successfully.")
else:
    print("Could not find start or end index.")
