const fs = require('fs');
const db = JSON.parse(fs.readFileSync('cinevora_data.json'));
console.log("Screenshots:", db.anime_screenshots ? db.anime_screenshots.length : 0);
if(db.anime_screenshots && db.anime_screenshots.length > 0) {
    console.log(db.anime_screenshots[0]);
}
