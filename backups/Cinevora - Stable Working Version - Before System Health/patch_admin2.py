import re

with open('admin/add-anime.html', 'r') as f:
    content = f.read()

validation_code = """
            const isDuplicate = currentEpisodes.some(e =>
              (e.season_number || 1) === epSeason &&
              e.episode_number === epNumber &&
              (!isEditing || e.id !== editingEpisode.id)
            );
            if (isDuplicate) {
              alert(`Validation Error: Episode ${epNumber} already exists in Season ${epSeason}. Please use a unique episode number.`);
              return;
            }
            
            // Qualities & Mirrors Validation
            for (let i = 0; i < currentQualities.length; i++) {
              const q = currentQualities[i];
              if (!q.quality.trim()) {
                alert(`Validation Error: Quality name cannot be empty (Quality #${i+1}).`);
                return;
              }
              if (q.mirrors) {
                for (let j = 0; j < q.mirrors.length; j++) {
                  const m = q.mirrors[j];
                  if (!m.name.trim()) {
                    alert(`Validation Error: Mirror name cannot be empty in quality ${q.quality}.`);
                    return;
                  }
                  if (!m.url.trim()) {
                    alert(`Validation Error: Mirror URL cannot be empty in quality ${q.quality} (Mirror ${m.name}).`);
                    return;
                  }
                  if (m.name.toLowerCase().includes('google drive')) {
                     const match = m.url.trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
                     if (!match || !match[1]) {
                        alert(`Validation Error: Invalid Google Drive URL in quality ${q.quality} (Mirror ${m.name}). Please provide a valid Google Drive file URL.`);
                        return;
                     }
                  }
                }
              }
            }
"""

content = re.sub(r'const isDuplicate = .*?\n            if \(isDuplicate\) \{.*?\n              return;\n            \}', validation_code, content, flags=re.DOTALL)

with open('admin/add-anime.html', 'w') as f:
    f.write(content)

print("Patched admin add-anime validation")
