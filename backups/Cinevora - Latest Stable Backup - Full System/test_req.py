import requests
import json

r = requests.delete('http://localhost:3000/api/admin/anime/ani-1/screenshots/scr-101', headers={"Cookie": "cinevora_auth=valid_token"})
print(r.status_code, r.text)
