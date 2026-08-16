import re

with open('server/db.ts', 'r') as f:
    content = f.read()

new_add_logic = """
    if (episode.qualities && Array.isArray(episode.qualities)) {
      episode.qualities.forEach(q => {
        if (q.video_url) {
           const match = String(q.video_url).trim().match(/(?:https?:\\/\\/)?(?:drive|docs)\\.google\\.com\\/(?:file\\/d\\/|open\\?id=|uc\\?id=)([a-zA-Z0-9_-]+)/);
           if (match && match[1]) {
             q.drive_file_id = match[1];
           }
        }
        if (q.mirrors && Array.isArray(q.mirrors)) {
           q.mirrors.forEach(m => {
             if (m.url) {
               const mMatch = String(m.url).trim().match(/(?:https?:\\/\\/)?(?:drive|docs)\\.google\\.com\\/(?:file\\/d\\/|open\\?id=|uc\\?id=)([a-zA-Z0-9_-]+)/);
               if (mMatch && mMatch[1]) {
                 m.drive_file_id = mMatch[1];
               }
             }
           });
        }
      });
    }

    const newEpisode: Episode = {
"""

content = content.replace("    const newEpisode: Episode = {", new_add_logic)

with open('server/db.ts', 'w') as f:
    f.write(content)
print("Patched addEpisode.")
