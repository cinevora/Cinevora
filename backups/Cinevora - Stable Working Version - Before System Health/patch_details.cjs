const fs = require('fs');
let html = fs.readFileSync('public/details.html', 'utf8');

const commentsHTML = `
          <!-- Comments Section -->
          <div class="glass-panel" style="margin-top: 2rem; padding: 1.5rem; border-radius: 16px;">
            <h3 style="font-size: 1.25rem; font-weight: 700; color: #f8fafc; margin-bottom: 1.5rem;">Comments</h3>
            <div id="comments-container">
              <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                <input type="text" id="comment-username" placeholder="Your Name" class="form-control" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); padding: 0.75rem; border-radius: 8px; color: #fff;">
                <textarea id="comment-text" placeholder="Write a comment..." class="form-control" rows="3" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); padding: 0.75rem; border-radius: 8px; color: #fff; resize: vertical;"></textarea>
                <div style="text-align: right;">
                  <button type="button" id="post-comment-btn" class="btn btn-primary" style="padding: 0.6rem 1.5rem;">Post Comment</button>
                </div>
              </div>
              <div id="comments-list" style="display: flex; flex-direction: column; gap: 1rem;">
                <!-- Comments will be rendered here -->
              </div>
            </div>
          </div>
`;

// In details.html, the related section is the last one before ad slot. Let's insert before the Ad Slot
html = html.replace(
  '<!-- Ad Slot DETAILS_BOTTOM -->',
  commentsHTML + '\n            <!-- Ad Slot DETAILS_BOTTOM -->'
);

const commentsLogic = `
        // Comments Logic
        const commentsList = document.getElementById('comments-list');
        const postBtn = document.getElementById('post-comment-btn');
        
        async function loadComments() {
          const res = await API.getComments(anime.id);
          if (res.comments) {
            if (res.comments.length === 0) {
              commentsList.innerHTML = '<div style="color: #64748b; text-align: center; padding: 1rem;">No comments yet. Be the first to comment!</div>';
            } else {
              commentsList.innerHTML = res.comments.map(c => \`
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong style="color: #38bdf8; font-size: 1rem;">\${c.username}</strong>
                    <span style="color: #64748b; font-size: 0.8rem;">\${new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap;">\${c.content}</p>
                </div>
              \`).join('');
            }
          }
        }
        
        if (postBtn) {
          postBtn.addEventListener('click', async () => {
            const usernameInput = document.getElementById('comment-username');
            const contentInput = document.getElementById('comment-text');
            const username = usernameInput.value.trim();
            const content = contentInput.value.trim();
            
            if (!username) return alert('Please enter a name');
            if (!content) return alert('Please enter a comment');
            
            postBtn.disabled = true;
            postBtn.innerText = 'Posting...';
            
            const res = await API.postComment(anime.id, username, content);
            if (res.error) {
              alert(res.error);
            } else {
              contentInput.value = '';
              await loadComments();
            }
            
            postBtn.disabled = false;
            postBtn.innerText = 'Post Comment';
          });
        }
        
        await loadComments();
`;

// Insert the logic before attach Watchlist action
html = html.replace('// Attach Watchlist Action', commentsLogic + '\n        // Attach Watchlist Action');

fs.writeFileSync('public/details.html', html);
console.log("details.html patched");
