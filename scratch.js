const http = require('http');

const payload = JSON.stringify([
  {
    amount: "10",
    type: "EXPENSE",
    date: new Date().toISOString(),
    category: "Printout",
    paymentMode: "Cash"
  },
  {
    amount: "80",
    type: "EXPENSE",
    date: new Date().toISOString(),
    category: "PP",
    paymentMode: "Cash"
  }
]);

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/transactions/bulk',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', data));
});

req.on('error', e => console.error(e));
req.write(payload);
req.end();
