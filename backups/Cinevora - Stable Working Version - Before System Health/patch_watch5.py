import re

with open('public/watch.html', 'r') as f:
    content = f.read()

fallback_logic = """
        let videoStreamUrl = selectedQuality ? selectedQuality.video_url : (activeEpisode ? activeEpisode.video_url : anime.video_url);
        let driveFileId = selectedQuality ? (selectedQuality.drive_file_id || extractDriveFileId(videoStreamUrl)) : ((activeEpisode && activeEpisode.drive_file_id) || (anime && anime.drive_file_id) || extractDriveFileId(videoStreamUrl));
        
        if (selectedQuality && !videoStreamUrl && selectedQuality.mirrors && selectedQuality.mirrors.length > 0) {
          videoStreamUrl = selectedQuality.mirrors[0].url;
          driveFileId = selectedQuality.mirrors[0].drive_file_id || extractDriveFileId(videoStreamUrl);
        }
"""

content = re.sub(r'const videoStreamUrl = .*?;\n        const driveFileId = .*?;', fallback_logic, content, flags=re.DOTALL)

with open('public/watch.html', 'w') as f:
    f.write(content)

print("Patched watch.html fallback")
