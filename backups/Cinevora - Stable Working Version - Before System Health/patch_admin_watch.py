import re

with open('admin/add-anime.html', 'r') as f:
    content = f.read()

# Change the display: none back to display: block and rename it
replacement = """
                <div style="margin-bottom: 1rem; display: block;">
                  <label class="form-label" style="color: #38bdf8;">Watch Online Source (Stream URL)</label>
                  <input type="text" class="form-control q-url-legacy" value="${q.video_url || ''}" placeholder="URL for the 'Watch Online' player (e.g. Google Drive link)">
                  <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem;">This video will be played when visitors click "Watch Online". If left blank, it will try to play the first mirror.</div>
                </div>
"""

content = re.sub(r'<div style="margin-bottom: 1rem; display: \$\{q\.mirrors\.length > 0 \? \'none\' : \'block\'\};">.*?</div>', replacement, content, flags=re.DOTALL)

with open('admin/add-anime.html', 'w') as f:
    f.write(content)
print("Patched admin add-anime watch source")
