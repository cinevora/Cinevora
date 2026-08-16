import re

with open('public/download-links.html', 'r') as f:
    content = f.read()

# Add mirrorId parameter extraction
param_extraction = """    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    const episodeId = urlParams.get('ep');
    const qualityId = urlParams.get('q');
    const mirrorId = urlParams.get('m');"""

content = re.sub(r'const urlParams = new URLSearchParams\(window\.location\.search\);\n    const animeId = urlParams\.get\(\'id\'\);\n    const episodeId = urlParams\.get\(\'ep\'\);\n    const qualityId = urlParams\.get\(\'q\'\);', param_extraction, content)

# Modify activeLinks logic
active_links_logic = """        let activeLinks = [];
        if (qualityId && epObj && epObj.qualities) {
          const qObj = epObj.qualities.find(q => q.id === qualityId);
          if (qObj) {
            if (mirrorId && qObj.mirrors) {
              const mObj = qObj.mirrors.find(m => m.id === mirrorId);
              if (mObj && mObj.url) {
                activeLinks.push({
                  host_name: mObj.name,
                  label: `${qObj.quality} Direct Download`,
                  url: mObj.url
                });
              }
            } else if (qObj.video_url) {
              activeLinks.push({
                host_name: 'Google Drive',
                label: `${qObj.quality} Direct Download`,
                url: qObj.video_url
              });
            }
          }
        }"""

content = re.sub(r'let activeLinks = \[\];\n        if \(qualityId && epObj && epObj\.qualities\) \{.*?\n        \}', active_links_logic, content, flags=re.DOTALL)

with open('public/download-links.html', 'w') as f:
    f.write(content)

print("Patched download-links.html")
