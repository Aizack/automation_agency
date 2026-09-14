const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/clients/client_test_optica/audit-logs?entity_type=invoice&entity_id=b7879176-acb7-4473-9777-0365266c3aba',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test' // test or bypass
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
});

req.on('error', e => console.error(e));
req.end();
