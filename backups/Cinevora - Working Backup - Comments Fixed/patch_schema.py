import re

with open('server/db.ts', 'r') as f:
    content = f.read()

content = content.replace(
"""export interface EpisodeQualityMirror {
  id: string;
  name: string;
  url: string;
  drive_file_id?: string;
}""",
"""export interface EpisodeQualityMirror {
  id: string;
  name: string;
  url: string;
  drive_file_id?: string;
  enabled?: boolean;
}"""
)

with open('server/db.ts', 'w') as f:
    f.write(content)
print("Added enabled? to EpisodeQualityMirror.")
