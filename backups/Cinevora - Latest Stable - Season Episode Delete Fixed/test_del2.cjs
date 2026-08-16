const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/anime/ani-1/screenshots/scr-101',
  method: 'DELETE',
  headers: {
    'Cookie': 'cinevora_auth=valid_token'
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.end();
