import fs from 'fs';
const raw = fs.readFileSync('./cinevora_data.json');
const db = JSON.parse(raw);
console.log("Screenshots:", db.anime_screenshots.length);
const initialLen = db.anime_screenshots.length;
const id = "scr-101";
db.anime_screenshots = db.anime_screenshots.filter(s => s.id !== id);
console.log("After:", db.anime_screenshots.length);
