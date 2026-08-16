const fs = require('fs');
const html = fs.readFileSync('public/watch.html', 'utf8');
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (scriptMatch) {
  try {
    const acorn = require('acorn');
    acorn.parse(scriptMatch[1], { ecmaVersion: 2022, sourceType: 'module' });
    console.log("Syntax OK");
  } catch(e) {
    console.error(e);
  }
}
