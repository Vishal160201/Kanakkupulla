const autocannon = require('autocannon');
const fs = require('fs');

const HEADERS = {
  'x-test-bypass': 'true',
  'Content-Type': 'application/json'
};

const BASE_URL = 'http://localhost:3000';

async function runTest(name, url, method, body, connections, duration) {
  console.log(`\n--- Running ${name} ---`);
  console.log(`URL: ${url} | Connections: ${connections} | Duration: ${duration}s`);
  
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      url,
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: HEADERS,
      connections,
      duration
    }, (err, result) => {
      if (err) return reject(err);
      
      console.log(`Req/Sec: ${result.requests.average}`);
      console.log(`Latency (p99): ${result.latency.p99} ms`);
      console.log(`Errors: ${result.errors}`);
      console.log(`Non-2xx Responses: ${result.non2xx}`);
      
      resolve({
        name,
        requestsPerSec: result.requests.average,
        latencyP50: result.latency.p50,
        latencyP90: result.latency.p90,
        latencyP99: result.latency.p99,
        errors: result.errors,
        non2xx: result.non2xx
      });
    });
    
    // autocannon.track(instance, {renderProgressBar: true});
  });
}

async function main() {
  const results = [];
  
  try {
    // Phase 1: Performance Testing (Low Concurrency)
    console.log('\n=== PHASE 1: PERFORMANCE TESTING ===');
    results.push(await runTest('Perf_Overview_GET', `${BASE_URL}/api/transactions/overview`, 'GET', null, 10, 10));
    results.push(await runTest('Perf_Transactions_GET', `${BASE_URL}/api/transactions`, 'GET', null, 10, 10));
    
    // Phase 2: Load Testing (Medium Concurrency)
    console.log('\n=== PHASE 2: LOAD TESTING ===');
    results.push(await runTest('Load_Overview_GET', `${BASE_URL}/api/transactions/overview`, 'GET', null, 50, 10));
    results.push(await runTest('Load_Transactions_GET', `${BASE_URL}/api/transactions`, 'GET', null, 50, 10));
    
    // Phase 3: Stress Testing (High Concurrency)
    console.log('\n=== PHASE 3: STRESS TESTING ===');
    results.push(await runTest('Stress_Overview_GET', `${BASE_URL}/api/transactions/overview`, 'GET', null, 200, 10));
    results.push(await runTest('Stress_Transactions_GET', `${BASE_URL}/api/transactions`, 'GET', null, 200, 10));
    
    // Write results to file
    fs.writeFileSync('./load_test_results.json', JSON.stringify(results, null, 2));
    console.log('\nTests completed successfully. Results saved to load_test_results.json');
    
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

main();
