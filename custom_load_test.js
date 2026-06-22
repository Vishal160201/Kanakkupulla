const fs = require('fs');

const HEADERS = {
  'x-test-bypass': 'true',
  'Content-Type': 'application/json'
};

const BASE_URL = 'http://localhost:3000';

async function measureEndpoint(url, method, body, concurrency, durationMs) {
  let requests = 0;
  let errors = 0;
  let non2xx = 0;
  const latencies = [];

  const startTest = Date.now();
  let keepRunning = true;

  setTimeout(() => { keepRunning = false; }, durationMs);

  async function worker() {
    while (keepRunning) {
      const reqStart = performance.now();
      try {
        const res = await fetch(url, {
          method,
          headers: HEADERS,
          body: body ? JSON.stringify(body) : undefined
        });
        
        if (!res.ok) non2xx++;
        
        // consume the body to free memory
        await res.text();
        
        const reqEnd = performance.now();
        latencies.push(reqEnd - reqStart);
        requests++;
      } catch (e) {
        errors++;
      }
    }
  }

  // Spawn concurrent workers
  const workers = Array.from({ length: concurrency }).map(worker);
  await Promise.all(workers);

  latencies.sort((a, b) => a - b);
  
  const getPercentile = (p) => {
    if (latencies.length === 0) return 0;
    const index = Math.floor((p / 100) * latencies.length);
    return latencies[index];
  };

  return {
    requestsPerSec: (requests / (durationMs / 1000)).toFixed(2),
    totalRequests: requests,
    errors,
    non2xx,
    latencyP50: getPercentile(50).toFixed(2),
    latencyP90: getPercentile(90).toFixed(2),
    latencyP99: getPercentile(99).toFixed(2),
  };
}

async function runTest(name, url, method, body, connections, durationSeconds) {
  console.log(`\n--- Running ${name} ---`);
  console.log(`URL: ${url} | Connections: ${connections} | Duration: ${durationSeconds}s`);
  
  const result = await measureEndpoint(url, method, body, connections, durationSeconds * 1000);
  
  console.log(`Req/Sec: ${result.requestsPerSec}`);
  console.log(`Total Requests: ${result.totalRequests}`);
  console.log(`Latency (p50): ${result.latencyP50} ms`);
  console.log(`Latency (p99): ${result.latencyP99} ms`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Non-2xx Responses: ${result.non2xx}`);
  
  return { name, ...result };
}

async function main() {
  const results = [];
  
  // Wait a moment for dev server to be stable
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    // Phase 1: Performance Testing
    console.log('\n=== PHASE 1: PERFORMANCE TESTING ===');
    results.push(await runTest('Perf_Overview_GET', `${BASE_URL}/api/transactions/overview`, 'GET', null, 5, 5));
    results.push(await runTest('Perf_Transactions_GET', `${BASE_URL}/api/transactions?limit=20`, 'GET', null, 5, 5));
    
    // Phase 2: Load Testing
    console.log('\n=== PHASE 2: LOAD TESTING ===');
    results.push(await runTest('Load_Overview_GET', `${BASE_URL}/api/transactions/overview`, 'GET', null, 25, 5));
    results.push(await runTest('Load_Transactions_GET', `${BASE_URL}/api/transactions?limit=20`, 'GET', null, 25, 5));
    
    // Phase 3: Stress Testing
    console.log('\n=== PHASE 3: STRESS TESTING ===');
    results.push(await runTest('Stress_Overview_GET', `${BASE_URL}/api/transactions/overview`, 'GET', null, 100, 5));
    
    // Write results to file
    fs.writeFileSync('./load_test_results.json', JSON.stringify(results, null, 2));
    console.log('\nTests completed successfully. Results saved to load_test_results.json');
    
  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

main();
