import re

with open('admin/add-anime.html', 'r') as f:
    content = f.read()

new_logic = """
          function renderQualities() {
            qualitiesList.innerHTML = '';
            currentQualities.forEach((q, idx) => {
              if (!q.mirrors) q.mirrors = [];
              const qDiv = document.createElement('div');
              qDiv.style.cssText = 'background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 1rem;';
              
              let mirrorsHtml = '';
              q.mirrors.forEach((m, midx) => {
                const isEnabled = m.enabled !== false; // default true
                mirrorsHtml += `
                  <div class="mirror-row" style="margin-bottom: 0.75rem; padding-left: 1rem; border-left: 2px solid rgba(255,255,255,0.1);">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 0.25rem;">
                      <label class="form-label" style="font-size:0.8rem; margin:0;">Mirror ${midx + 1}</label>
                      <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button type="button" class="btn btn-glass move-m-up" style="padding:0.1rem 0.4rem; font-size:0.7rem;" data-qidx="${idx}" data-midx="${midx}" ${midx===0?'disabled':''}>&uarr;</button>
                        <button type="button" class="btn btn-glass move-m-down" style="padding:0.1rem 0.4rem; font-size:0.7rem;" data-qidx="${idx}" data-midx="${midx}" ${midx===q.mirrors.length-1?'disabled':''}>&darr;</button>
                        <label style="font-size: 0.7rem; display: flex; align-items: center; gap: 0.25rem; color: #f8fafc; cursor: pointer;">
                          <input type="checkbox" class="m-enabled" data-qidx="${idx}" data-midx="${midx}" ${isEnabled ? 'checked' : ''}>
                          Enabled
                        </label>
                        <button type="button" class="btn btn-glass del-m-btn" style="padding:0.1rem 0.4rem; font-size:0.7rem; color:#ef4444;" data-qidx="${idx}" data-midx="${midx}">Delete</button>
                      </div>
                    </div>
                    <input type="text" class="form-control m-name" value="${m.name}" placeholder="Mirror Name (e.g. Google Drive)" data-qidx="${idx}" data-midx="${midx}" style="margin-bottom:0.5rem; font-size:0.85rem;">
                    <input type="text" class="form-control m-url" value="${m.url}" placeholder="Mirror URL" data-qidx="${idx}" data-midx="${midx}" style="font-size:0.85rem;">
                  </div>
                `;
              });

              qDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom: 1rem; align-items: center;">
                  <strong style="color: #f8fafc; font-size: 1.1rem;">${q.quality || 'New Quality'}</strong>
                  <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn btn-glass move-q-up" style="padding:0.25rem 0.5rem; font-size:0.8rem;" data-idx="${idx}" ${idx===0?'disabled':''}>Move Up</button>
                    <button type="button" class="btn btn-glass move-q-down" style="padding:0.25rem 0.5rem; font-size:0.8rem;" data-idx="${idx}" ${idx===currentQualities.length-1?'disabled':''}>Move Down</button>
                    <button type="button" class="btn btn-glass del-q-btn" style="padding:0.25rem 0.75rem; font-size:0.8rem; color:#ef4444;" data-idx="${idx}">Delete Quality</button>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                  <div>
                    <label class="form-label">Quality Name *</label>
                    <input type="text" class="form-control q-name" value="${q.quality}" placeholder="e.g. 720p">
                  </div>
                  <div>
                    <label class="form-label">Codec (Optional)</label>
                    <input type="text" class="form-control q-codec" value="${q.codec || ''}" placeholder="e.g. x264">
                  </div>
                  <div>
                    <label class="form-label">Size (Optional)</label>
                    <input type="text" class="form-control q-size" value="${q.size || ''}" placeholder="e.g. 190MB">
                  </div>
                </div>
                
                <div style="margin-bottom: 1rem; display: block;">
                  <label class="form-label" style="color: #38bdf8;">Watch Online Source (Stream URL)</label>
                  <input type="text" class="form-control q-url-legacy" value="${q.video_url || ''}" placeholder="URL for the 'Watch Online' player (e.g. Google Drive link)">
                  <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem;">This video will be played when visitors click "Watch Online". If left blank, it will try to play the first mirror.</div>
                </div>

                <div style="margin-top: 1rem;">
                  <label class="form-label" style="color:#a855f7; font-weight:700;">Mirrors</label>
                  <div class="mirrors-list" style="margin-top:0.5rem; margin-bottom:0.5rem;">
                    ${mirrorsHtml}
                  </div>
                  <button type="button" class="btn btn-glass add-m-btn" style="font-size:0.8rem; padding: 0.3rem 0.6rem;" data-idx="${idx}">+ Add Mirror</button>
                </div>
              `;
              
              qDiv.querySelector('.del-q-btn').addEventListener('click', (e) => {
                const i = parseInt(e.target.dataset.idx);
                currentQualities.splice(i, 1);
                renderQualities();
              });
              
              const qUp = qDiv.querySelector('.move-q-up');
              if (qUp) qUp.addEventListener('click', (e) => {
                const i = parseInt(e.target.dataset.idx);
                if (i > 0) {
                  [currentQualities[i], currentQualities[i - 1]] = [currentQualities[i - 1], currentQualities[i]];
                  renderQualities();
                }
              });
              
              const qDown = qDiv.querySelector('.move-q-down');
              if (qDown) qDown.addEventListener('click', (e) => {
                const i = parseInt(e.target.dataset.idx);
                if (i < currentQualities.length - 1) {
                  [currentQualities[i], currentQualities[i + 1]] = [currentQualities[i + 1], currentQualities[i]];
                  renderQualities();
                }
              });
              
              qDiv.querySelector('.add-m-btn').addEventListener('click', (e) => {
                const i = parseInt(e.target.dataset.idx);
                if (!currentQualities[i].mirrors) currentQualities[i].mirrors = [];
                currentQualities[i].mirrors.push({ id: 'm-' + Date.now(), name: '', url: '', enabled: true });
                renderQualities();
              });

              qDiv.querySelectorAll('.del-m-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const qi = parseInt(e.target.dataset.qidx);
                  const mi = parseInt(e.target.dataset.midx);
                  currentQualities[qi].mirrors.splice(mi, 1);
                  renderQualities();
                });
              });
              
              qDiv.querySelectorAll('.move-m-up').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const qi = parseInt(e.target.dataset.qidx);
                  const mi = parseInt(e.target.dataset.midx);
                  if (mi > 0) {
                    const m = currentQualities[qi].mirrors;
                    [m[mi], m[mi - 1]] = [m[mi - 1], m[mi]];
                    renderQualities();
                  }
                });
              });
              
              qDiv.querySelectorAll('.move-m-down').forEach(btn => {
                btn.addEventListener('click', (e) => {
                  const qi = parseInt(e.target.dataset.qidx);
                  const mi = parseInt(e.target.dataset.midx);
                  const m = currentQualities[qi].mirrors;
                  if (mi < m.length - 1) {
                    [m[mi], m[mi + 1]] = [m[mi + 1], m[mi]];
                    renderQualities();
                  }
                });
              });
              
              qDiv.querySelectorAll('.m-enabled').forEach(input => {
                input.addEventListener('change', (e) => {
                  const qi = parseInt(e.target.dataset.qidx);
                  const mi = parseInt(e.target.dataset.midx);
                  currentQualities[qi].mirrors[mi].enabled = e.target.checked;
                });
              });
              
              qDiv.querySelector('.q-name').addEventListener('input', (e) => {
                q.quality = e.target.value;
                qDiv.querySelector('strong').innerText = q.quality || 'New Quality';
              });
              qDiv.querySelector('.q-codec').addEventListener('input', (e) => {
                q.codec = e.target.value;
              });
              qDiv.querySelector('.q-size').addEventListener('input', (e) => {
                q.size = e.target.value;
              });
              const legacyUrl = qDiv.querySelector('.q-url-legacy');
              if (legacyUrl) {
                legacyUrl.addEventListener('input', (e) => {
                  q.video_url = e.target.value;
                });
              }

              qDiv.querySelectorAll('.m-name').forEach(input => {
                input.addEventListener('input', (e) => {
                  const qi = parseInt(e.target.dataset.qidx);
                  const mi = parseInt(e.target.dataset.midx);
                  currentQualities[qi].mirrors[mi].name = e.target.value;
                });
              });
              qDiv.querySelectorAll('.m-url').forEach(input => {
                input.addEventListener('input', (e) => {
                  const qi = parseInt(e.target.dataset.qidx);
                  const mi = parseInt(e.target.dataset.midx);
                  currentQualities[qi].mirrors[mi].url = e.target.value;
                });
              });
              
              qualitiesList.appendChild(qDiv);
            });
          }
"""

start_idx = content.find("function renderQualities() {")
end_idx = content.find("formBox.querySelector('#add-quality-btn').addEventListener('click', () => {")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_logic + "\n          " + content[end_idx:]
    with open('admin/add-anime.html', 'w') as f:
        f.write(content)
    print("Replaced renderQualities successfully.")
else:
    print("Could not find start or end index.")
