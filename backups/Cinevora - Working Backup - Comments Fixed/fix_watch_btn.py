import re

with open('public/watch.html', 'r') as f:
    content = f.read()

# Replace the renderSelectedQuality detailsContainer innerHTML
old_str = """
            // REMOVED THE WATCH ONLINE BUTTON HERE!
            detailsContainer.innerHTML = `
              <div style="font-size: 1.2rem; color: #f8fafc; font-weight: 800; margin-bottom: 1.5rem;">
                ${q.quality}${codec}${size}
              </div>
              <div style="font-size: 1rem; color: #94a3b8; font-weight: 700; margin-bottom: 1rem;">
                Select a mirror to open:
              </div>
              <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                ${mirrorsHtml || '<span style="color:#ef4444; font-size:0.9rem;">No mirrors available</span>'}
              </div>
            `;
"""

new_str = """
            let watchBtnHtml = '';
            // Only show WATCH ONLINE if there is a stream URL and it's NOT Google Drive
            if (q.video_url && !q.drive_file_id && !extractDriveFileId(q.video_url)) {
              watchBtnHtml = `
                <div style="display: flex; justify-content: center; margin-bottom: 2rem;">
                  <a href="/watch.html?id=${anime.id}&ep=${activeEpisode.id}&q=${q.id}" class="btn btn-primary" style="font-weight: 800; padding: 0.75rem 2rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    WATCH ONLINE
                  </a>
                </div>
              `;
            }

            detailsContainer.innerHTML = `
              <div style="font-size: 1.2rem; color: #f8fafc; font-weight: 800; margin-bottom: 1.5rem;">
                ${q.quality}${codec}${size}
              </div>
              ${watchBtnHtml}
              <div style="font-size: 1rem; color: #94a3b8; font-weight: 700; margin-bottom: 1rem;">
                Download / Mirror Links:
              </div>
              <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                ${mirrorsHtml || '<span style="color:#ef4444; font-size:0.9rem;">No mirrors available</span>'}
              </div>
            `;
"""

content = content.replace(old_str, new_str)
with open('public/watch.html', 'w') as f:
    f.write(content)
print("Restored Watch Online button conditionally")
