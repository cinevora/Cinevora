import re

with open('public/download-gateway.html', 'r') as f:
    content = f.read()

# I need to get the m parameter as well.
param_extraction = """    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    const episodeId = urlParams.get('ep');
    const qualityId = urlParams.get('q');
    const mirrorId = urlParams.get('m');"""

content = re.sub(r'const urlParams = new URLSearchParams\(window\.location\.search\);\n    const animeId = urlParams\.get\(\'id\'\);\n    const episodeId = urlParams\.get\(\'ep\'\);\n    const qualityId = urlParams\.get\(\'q\'\);', param_extraction, content)

redirect_logic = "window.location.href = `/download-links.html?id=${animeId}${episodeId ? `&ep=${episodeId}` : ''}${qualityId ? `&q=${qualityId}` : ''}${mirrorId ? `&m=${mirrorId}` : ''}`;"
content = re.sub(r'window\.location\.href = `/download-links\.html\?id=\$\{animeId\}\$\{episodeId \? `&ep=\$\{episodeId\}` : \'\'\}\$\{qualityId \? `&q=\$\{qualityId\}` : \'\'\}`;', redirect_logic, content)

with open('public/download-gateway.html', 'w') as f:
    f.write(content)

print("Patched download-gateway.html")
