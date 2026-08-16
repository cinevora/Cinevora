import re

with open('public/watch.html', 'r') as f:
    content = f.read()

# I need to insert the event listeners immediately after initWatchPage() finishes its innerHTML insertion.
# Let's find the end of container.innerHTML insertion block:
# It ends around: `        // Episode Next / Prev Handlers`

injection_script = """
        if (showQualitySelection) {
          const cards = document.querySelectorAll('.quality-card');
          const watchBtn = document.getElementById('btn-watch-online');
          const dlBtn = document.getElementById('btn-download');
          const lbl = document.getElementById('selected-quality-label');
          
          cards.forEach(c => {
            c.addEventListener('click', () => {
              cards.forEach(oc => {
                oc.classList.remove('selected');
                oc.style.borderColor = 'rgba(255,255,255,0.1)';
                oc.querySelector('div').style.color = '#f8fafc';
              });
              c.classList.add('selected');
              c.style.borderColor = '#a855f7';
              c.querySelector('div').style.color = '#a855f7';
              
              const qid = c.getAttribute('data-qid');
              const qname = c.getAttribute('data-qname');
              lbl.innerText = qname;
              watchBtn.href = `/watch.html?id=${anime.id}&ep=${activeEpisode.id}&q=${qid}`;
              dlBtn.href = `/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}&q=${qid}`;
            });
          });
        }
        
        // Episode Next / Prev Handlers
"""

content = content.replace("        // Episode Next / Prev Handlers", injection_script)

with open('public/watch.html', 'w') as f:
    f.write(content)
print("Patched script block")
