const autocannon = require('autocannon');
const fs = require('fs');

async function runLoadTests() {
  console.log('Starting Load Test (GET /api/test-load)...');
  
  const loadTest = autocannon({
    url: 'http://localhost:3000/api/test-load?startDate=2026-06-01&endDate=2026-08-31',
    connections: 100, // Concurrent connections
    duration: 10,     // Test duration in seconds
    method: 'GET'
  });

  autocannon.track(loadTest, { renderProgressBar: true });

  await new Promise((resolve) => {
    loadTest.on('done', (result) => {
      console.log('\\n--- Load Test Results ---');
      console.log(`Total Requests: ${result.requests.total}`);
      console.log(`Average Latency: ${result.latency.average} ms`);
      console.log(`P99 Latency: ${result.latency.p99} ms`);
      console.log(`Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`Errors: ${result.errors}`);
      
      fs.writeFileSync('load-test-results.json', JSON.stringify(result, null, 2));
      resolve();
    });
  });

  console.log('\\nStarting Stress Test (POST /api/test-load)...');
  
  const stressTest = autocannon({
    url: 'http://localhost:3000/api/test-load',
    connections: 50, // Concurrent connections
    duration: 10,    // Test duration in seconds
    method: 'POST'
  });

  autocannon.track(stressTest, { renderProgressBar: true });

  await new Promise((resolve) => {
    stressTest.on('done', (result) => {
      console.log('\\n--- Stress Test Results ---');
      console.log(`Total Bookings Created: ${result.requests.total}`);
      console.log(`Average Latency: ${result.latency.average} ms`);
      console.log(`P99 Latency: ${result.latency.p99} ms`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Non-2xx Responses: ${result.non2xx}`);
      
      fs.writeFileSync('stress-test-results.json', JSON.stringify(result, null, 2));
      resolve();
    });
  });
}

runLoadTests().catch(console.error);
