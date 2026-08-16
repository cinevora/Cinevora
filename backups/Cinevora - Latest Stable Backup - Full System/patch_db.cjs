const fs = require('fs');

let content = fs.readFileSync('server/db.ts', 'utf8');

const commentInterface = `
export interface Comment {
  id: string;
  anime_id: string;
  username: string;
  content: string;
  created_at: string;
}
`;

content = content.replace('export interface AnimeScreenshot {', commentInterface + '\nexport interface AnimeScreenshot {');

content = content.replace('  anime_screenshots?: AnimeScreenshot[];', '  anime_screenshots?: AnimeScreenshot[];\n  comments?: Comment[];');

const commentMethods = `
  // --- Comments ---
  public getCommentsForAnime(anime_id: string): Comment[] {
    return (this.data.comments || [])
      .filter(c => c.anime_id === anime_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addComment(anime_id: string, username: string, content: string): Comment {
    if (!this.data.comments) this.data.comments = [];
    const newComment: Comment = {
      id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      anime_id,
      username,
      content,
      created_at: new Date().toISOString()
    };
    this.data.comments.push(newComment);
    this.saveData();
    return newComment;
  }

  public deleteComment(id: string): boolean {
    if (!this.data.comments) return false;
    const initialLen = this.data.comments.length;
    this.data.comments = this.data.comments.filter(c => c.id !== id);
    if (this.data.comments.length !== initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }
`;

content = content.replace('// --- Screenshots ---', commentMethods + '\n  // --- Screenshots ---');

fs.writeFileSync('server/db.ts', content);
console.log("DB patched");
