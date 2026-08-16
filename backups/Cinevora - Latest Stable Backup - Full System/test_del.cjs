import fs from 'fs';

async function test() {
    const raw = fs.readFileSync('./cinevora_data.json', 'utf8');
    const db = JSON.parse(raw);
    console.log(db.anime_screenshots.length);
}
test();
