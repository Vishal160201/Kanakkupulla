const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/transactions?view=month',
  method: 'GET',
  headers: {
    'x-test-bypass': 'true',
    'x-test-user-id': 'cm0y6s0a20000j5a5h2v67295'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const parsed = JSON.parse(data);
    if (parsed.items) {
      console.log('Items:', parsed.items.length);
    } else {
      console.log('Data:', parsed);
    }
  });
});

req.on('error', (e) => console.error(e));
req.end();
