const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

// Insert EpisodeQuality interface
if (!code.includes('export interface EpisodeQuality')) {
  const insertIndex = code.indexOf('export interface Episode {');
  const qualityInterface = `export interface EpisodeQuality {
  id: string;
  quality: string;
  video_url: string;
  drive_file_id?: string;
  status: 'PUBLISHED' | 'UNPUBLISHED';
}

`;
  code = code.substring(0, insertIndex) + qualityInterface + code.substring(insertIndex);
}

// Add qualities to Episode interface
if (!code.includes('qualities?: EpisodeQuality[];')) {
  code = code.replace(/export interface Episode \{([\s\S]*?)created_at/m, (match, p1) => {
    return `export interface Episode {${p1}qualities?: EpisodeQuality[];\n  created_at`;
  });
}

fs.writeFileSync('server/db.ts', code);
console.log('Updated db.ts schema');
