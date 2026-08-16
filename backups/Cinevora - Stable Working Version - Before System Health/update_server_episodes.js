const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// For add episode:
code = code.replace(/app\.post\('\/api\/admin\/episodes'.*?(\n.*?)*?const newEp: Episode = \{/, (match) => {
  return match.replace('const newEp: Episode = {', `
    if (req.body.qualities) {
      req.body.qualities.forEach(q => {
        if (q.video_url) {
          q.drive_file_id = extractGoogleDriveFileId(q.video_url) || undefined;
        }
      });
    }
    const newEp: Episode = {`);
});

// For update episode:
code = code.replace(/app\.put\('\/api\/admin\/episodes\/:id'.*?(\n.*?)*?const updatedEp = db\.updateEpisode\(id, updateData\);/, (match) => {
  return match.replace('const updatedEp = db.updateEpisode(id, updateData);', `
    if (updateData.qualities) {
      updateData.qualities.forEach(q => {
        if (q.video_url) {
          q.drive_file_id = extractGoogleDriveFileId(q.video_url) || undefined;
        }
      });
    }
    const updatedEp = db.updateEpisode(id, updateData);`);
});

fs.writeFileSync('server.ts', code);
