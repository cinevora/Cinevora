const fs = require('fs');
const dbRaw = fs.readFileSync('./cinevora_data.json', 'utf8');
const data = JSON.parse(dbRaw);
const scrCount = data.anime_screenshots ? data.anime_screenshots.length : 0;
console.log('Screenshots count:', scrCount);
