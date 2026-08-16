import re

with open('public/watch.html', 'r') as f:
    content = f.read()

old_logic = "if (q.mirrors && q.mirrors.length > 0) {"
new_logic = """if (q.mirrors && q.mirrors.filter(m => m.enabled !== false).length > 0) {
                  const enabledMirrors = q.mirrors.filter(m => m.enabled !== false);
                  mirrorsHtml = enabledMirrors.map((m, mIdx) => `
                    <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}&q=${q.id}&m=${m.id}" style="color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 1.05rem; white-space: nowrap;" target="_blank">
                      ${m.name}
                    </a>
                    ${mIdx < enabledMirrors.length - 1 ? '<span style="color: rgba(255,255,255,0.3); margin: 0 0.4rem;">|</span>' : ''}
                  `).join('');"""

content = content.replace("""if (q.mirrors && q.mirrors.length > 0) {
                  mirrorsHtml = q.mirrors.map((m, mIdx) => `
                    <a href="/download-gateway.html?id=${anime.id}&ep=${activeEpisode.id}&q=${q.id}&m=${m.id}" style="color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 1.05rem; white-space: nowrap;" target="_blank">
                      ${m.name}
                    </a>
                    ${mIdx < q.mirrors.length - 1 ? '<span style="color: rgba(255,255,255,0.3); margin: 0 0.4rem;">|</span>' : ''}
                  `).join('');""", new_logic)

with open('public/watch.html', 'w') as f:
    f.write(content)
print("Replaced mirrorsHtml filter successfully.")
