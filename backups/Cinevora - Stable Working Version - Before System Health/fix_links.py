import re
with open('public/download-links.html', 'r') as f:
    content = f.read()

content = content.replace("const activeLinks = links.filter(l => l.enabled !== false);", """
        let activeLinks = [];
        if (qualityId && epObj && epObj.qualities) {
          const qObj = epObj.qualities.find(q => q.id === qualityId);
          if (qObj && qObj.video_url) {
            activeLinks.push({
              host_name: 'Google Drive',
              label: `${qObj.quality} Direct Download`,
              url: qObj.video_url
            });
          }
        }
        
        if (activeLinks.length === 0) {
          activeLinks = links.filter(l => l.enabled !== false);
        }
""")
with open('public/download-links.html', 'w') as f:
    f.write(content)
print("Fixed download-links.html")
