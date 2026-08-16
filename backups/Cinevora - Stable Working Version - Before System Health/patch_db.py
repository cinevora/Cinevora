import re

with open('server/db.ts', 'r') as f:
    content = f.read()

qualities_logic = """
    if (updatePayload.qualities && Array.isArray(updatePayload.qualities)) {
      updatePayload.qualities.forEach(q => {
        if (q.video_url) {
           const match = String(q.video_url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
           if (match && match[1]) {
             q.drive_file_id = match[1];
           }
        }
        if (q.mirrors && Array.isArray(q.mirrors)) {
           q.mirrors.forEach(m => {
             if (m.url) {
               const mMatch = String(m.url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
               if (mMatch && mMatch[1]) {
                 m.drive_file_id = mMatch[1];
               }
             }
           });
        }
      });
    }
"""

content = content.replace("    const updated: Episode = {", qualities_logic + "\n    const updated: Episode = {")

# Also patch addEpisode
qualities_logic_add = """
    if (episode.video_url) {
      const match = String(episode.video_url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        episode.drive_file_id = match[1];
      }
    }
    if (episode.qualities && Array.isArray(episode.qualities)) {
      episode.qualities.forEach(q => {
        if (q.video_url) {
           const match = String(q.video_url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
           if (match && match[1]) {
             q.drive_file_id = match[1];
           }
        }
        if (q.mirrors && Array.isArray(q.mirrors)) {
           q.mirrors.forEach(m => {
             if (m.url) {
               const mMatch = String(m.url).trim().match(/(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
               if (mMatch && mMatch[1]) {
                 m.drive_file_id = mMatch[1];
               }
             }
           });
        }
      });
    }
"""

content = re.sub(r'public addEpisode\(episode: Omit<Episode, \'id\'>\): Episode \{.*?\n    if \(episode\.thumbnail\) \{.*?\n      episode\.thumbnail = saveBase64Image\(episode\.thumbnail, \'ep\'\);\n    \}', r"public addEpisode(episode: Omit<Episode, 'id'>): Episode {\n    if (episode.thumbnail) {\n      episode.thumbnail = saveBase64Image(episode.thumbnail, 'ep');\n    }" + qualities_logic_add, content, flags=re.DOTALL)

with open('server/db.ts', 'w') as f:
    f.write(content)
print("Patched db.ts")
