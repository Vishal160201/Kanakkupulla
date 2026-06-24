import autocannon from 'autocannon';
import { PERF_CONFIG, getScenario, EndpointDef, TestScenario } from './perf.config.js';
import { createAuthenticatedUsers, AuthSession, cleanupUser } from './auth-helper.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULT_DIR = join(__dirname, '..', 'perf-results');

interface EndpointResult {
  name: string;
  url: string;
  method: string;
  requestsPerSec: number;
  totalRequests: number;
  duration: number;
  errors: number;
  non2xx: number;
  latencyP50: number;
  latencyP90: number;
  latencyP99: number;
  throughputBytes: number;
  maxLatency: number;
  minLatency: number;
  passed: boolean;
  budgets: {
    p50Passed: boolean;
    p90Passed: boolean;
    p99Passed: boolean;
    errorRatePassed: boolean;
  };
}

interface ScenarioResult {
  scenario: string;
  timestamp: string;
  duration: number;
  endpoints: EndpointResult[];
  summary: {
    totalRequests: number;
    totalErrors: number;
    avgThroughput: number;
    passedEndpoints: number;
    failedEndpoints: number;
  };
}

const PASS_EMOJI = '\x1b[32m✓\x1b[0m';
const FAIL_EMOJI = '\x1b[31m✗\x1b[0m';
const WARN_EMOJI = '\x1b[33m⚠\x1b[0m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function getColorForPercentile(value: number, threshold: number): string {
  if (value <= threshold * 0.5) return '\x1b[32m';
  if (value <= threshold * 0.8) return '\x1b[33m';
  if (value <= threshold) return '\x1b[38;5;208m';
  return '\x1b[31m';
}

function formatLatency(ms: number, threshold: number): string {
  const color = getColorForPercentile(ms, threshold);
  return `${color}${ms.toFixed(2)} ms${RESET}`;
}

async function runAutocannon(
  url: string,
  method: string,
  cookie: string,
  connections: number,
  duration: number,
  body?: string,
): Promise<autocannon.Result> {
  return new Promise((resolve, reject) => {
    const opts: autocannon.Options = {
      url,
      method: method as any,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
      },
      connections,
      duration,
      timeout: 10,
      bailout: duration,
      excludeErrorStats: true,
      ...(body ? { body } : {}),
    };

    const instance = autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    // Track progress
    autocannon.track(instance, {
      renderProgressBar: true,
      renderLatencyTable: false,
      renderResultsTable: false,
    });
  });
}

function analyzeResult(
  endpoint: EndpointDef,
  result: autocannon.Result,
  threshold: { p50: number; p90: number; p99: number },
): EndpointResult {
  const p50 = result.latency.p50;
  const p90 = result.latency.p90;
  const p99 = result.latency.p99;
  const errorRate = result.errors / (result.requests.total || 1);

  const budgets = {
    p50Passed: p50 <= threshold.p50,
    p90Passed: p90 <= threshold.p90,
    p99Passed: p99 <= threshold.p99,
    errorRatePassed: errorRate < 0.01,
  };

  const passed = budgets.p50Passed && budgets.p90Passed && budgets.p99Passed && budgets.errorRatePassed;

  const fullUrl = `${PERF_CONFIG.baseUrl}${endpoint.path}${endpoint.query || ''}`;

  return {
    name: `${endpoint.method} ${endpoint.path}`,
    url: fullUrl,
    method: endpoint.method,
    requestsPerSec: result.requests.average,
    totalRequests: result.requests.total,
    duration: result.duration,
    errors: result.errors,
    non2xx: result.non2xx,
    latencyP50: p50,
    latencyP90: p90,
    latencyP99: p99,
    throughputBytes: result.throughput.average,
    maxLatency: result.latency.max,
    minLatency: result.latency.min,
    passed,
    budgets,
  };
}

function printResult(er: EndpointResult, threshold: { p50: number; p90: number; p99: number }) {
  const icon = er.passed ? PASS_EMOJI : FAIL_EMOJI;
  console.log(`\n  ${icon} ${BOLD}${er.name}${RESET}`);
  console.log(`    Requests/sec: ${er.requestsPerSec.toFixed(2)}`);
  console.log(`    Total: ${er.totalRequests} | Errors: ${er.errors} | Non-2xx: ${er.non2xx}`);
  console.log(`    Latency: p50=${formatLatency(er.latencyP50, threshold.p50)} ` +
    `| p90=${formatLatency(er.latencyP90, threshold.p90)} ` +
    `| p99=${formatLatency(er.latencyP99, threshold.p99)}`);
  console.log(`    Throughput: ${(er.throughputBytes / 1024).toFixed(2)} KB/s`);

  if (!er.passed) {
    const failures: string[] = [];
    if (!er.budgets.p50Passed) failures.push(`p50=${er.latencyP50.toFixed(0)}ms > ${threshold.p50}ms`);
    if (!er.budgets.p90Passed) failures.push(`p90=${er.latencyP90.toFixed(0)}ms > ${threshold.p90}ms`);
    if (!er.budgets.p99Passed) failures.push(`p99=${er.latencyP99.toFixed(0)}ms > ${threshold.p99}ms`);
    if (!er.budgets.errorRatePassed) failures.push(`errors=${er.errors}`);
    console.log(`    ${FAIL_EMOJI} Budgets exceeded: ${failures.join(', ')}`);
  }
}

async function testEndpoint(
  endpoint: EndpointDef,
  sessions: AuthSession[],
  connections: number,
  duration: number,
  thresholds: { p50: number; p90: number; p99: number },
  preFetchedClientId = '',
): Promise<EndpointResult> {
  const fullUrl = `${PERF_CONFIG.baseUrl}${endpoint.path}${endpoint.query || ''}`;
  console.log(`\n${BOLD}── Testing ${endpoint.method} ${endpoint.path} ──${RESET}`);

  const cookies = sessions.map(s => s.cookie);
  const cookie = cookies[0];

  // Generate request body for POST/PUT
  let body: string | undefined;
  if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
    const today = new Date().toISOString().split('T')[0];
    if (endpoint.path === '/api/transactions') {
      body = JSON.stringify({
        amount: 5000,
        type: 'INCOME',
        date: today,
        category: 'Photography Session',
        paymentMode: 'UPI',
        description: `Perf test ${Date.now()}`,
        status: 'SETTLED',
      });
    } else if (endpoint.path === '/api/bookings') {
      body = JSON.stringify({
        clientId: preFetchedClientId,
        category: 'Wedding',
        date: today,
        time: '10:00 AM',
        location: 'Test Location',
        status: 'Confirmed',
      });
    } else {
      body = '{}';
    }
  }

  const result = await runAutocannon(fullUrl, endpoint.method, cookie, connections, duration, body);
  return analyzeResult(endpoint, result, thresholds);
}

async function testUserJourney(
  sessions: AuthSession[],
  duration: number,
): Promise<EndpointResult[]> {
  console.log(`\n${BOLD}── User Journey Simulation ──${RESET}`);
  const results: EndpointResult[] = [];
  const cookie = sessions[0].cookie;

  const journey = [
    { path: '/api/dashboard/overview', method: 'GET' },
    { path: '/api/transactions/overview', method: 'GET' },
    { path: '/api/bookings', method: 'GET' },
    { path: '/api/transactions', method: 'GET', query: '?view=month' },
  ];

  for (const step of journey) {
    const fullUrl = `${PERF_CONFIG.baseUrl}${step.path}${step.query || ''}`;
    console.log(`  Simulating: ${step.method} ${step.path}`);
    const result = await runAutocannon(fullUrl, step.method, cookie, 5, Math.ceil(duration / journey.length));
    results.push(analyzeResult(step as EndpointDef, result, PERF_CONFIG.thresholds.GET));
    await new Promise(r => setTimeout(r, 100));
  }

  return results;
}

async function saveResults(result: ScenarioResult) {
  if (!existsSync(RESULT_DIR)) {
    mkdirSync(RESULT_DIR, { recursive: true });
  }

  const timestamp = result.timestamp.replace(/[:.]/g, '-').replace(/\s+/g, '_');
  const scenarioSlug = result.scenario.replace(/\s+/g, '_');
  const filename = `perf-${scenarioSlug}-${timestamp}.json`;
  const filepath = join(RESULT_DIR, filename);

  writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`\n  ${PASS_EMOJI} Results saved to ${filepath}`);
}

async function main() {
  console.log('\x1b[1m\x1b[35m╔═══════════════════════════════════════════╗');
  console.log('║     Kanakkupulla Performance Test Suite     ║');
  console.log('╚═══════════════════════════════════════════╝\x1b[0m');

  const scenarioName = process.argv[2] || 'smoke';
  const scenario = getScenario(scenarioName);
  const thresholds = PERF_CONFIG.thresholds;

  console.log(`\nScenario: ${BOLD}${scenario.name}${RESET}`);
  console.log(`Connections: ${scenario.connections} | Duration: ${scenario.duration}s\n`);

  const startTime = Date.now();

  // Create test sessions via Prisma (no register API)
  const numUsers = Math.min(scenario.connections, 10);
  console.log(`Creating ${numUsers} authenticated test sessions...`);
  const sessions = await createAuthenticatedUsers(numUsers);

  // Pre-fetch one valid clientId for POST /api/bookings
  let preFetchedClientId = '';
  try {
    const res = await fetch(`${PERF_CONFIG.baseUrl}/api/clients`, {
      headers: { Cookie: sessions[0]?.cookies || '' },
    });
    const clients = await res.json();
    if (Array.isArray(clients) && clients.length > 0) {
      preFetchedClientId = clients[0].id;
      console.log(`Pre-fetched clientId: ${preFetchedClientId}`);
    }
  } catch {
    console.warn('Could not pre-fetch clientId for POST /api/bookings');
  }

  if (sessions.length === 0) {
    console.error(`${FAIL_EMOJI} No authenticated sessions available. Aborting.`);
    process.exit(1);
  }

  console.log(`${PASS_EMOJI} ${sessions.length}/${numUsers} sessions ready\n`);

  const allResults: EndpointResult[] = [];

  // Run endpoint tests
  for (const endpoint of scenario.endpoints) {
    const result = await testEndpoint(
      endpoint,
      sessions,
      scenario.connections,
      scenario.duration,
      endpoint.method === 'POST' || endpoint.method === 'PUT'
        ? thresholds.POST
        : thresholds.GET,
      preFetchedClientId,
    );
    allResults.push(result);
    printResult(result, thresholds.GET);
  }

  // If journey scenario, also run the user journey
  if (scenarioName === 'journey') {
    const journeyResults = await testUserJourney(sessions, scenario.duration);
    allResults.push(...journeyResults);
  }

  // Summary
  const totalRequests = allResults.reduce((sum, r) => sum + r.totalRequests, 0);
  const totalErrors = allResults.reduce((sum, r) => sum + r.errors, 0);
  const passedEndpoints = allResults.filter(r => r.passed).length;
  const avgThroughput = allResults.reduce((sum, r) => sum + r.requestsPerSec, 0) / allResults.length;

  const elapsed = (Date.now() - startTime) / 1000;

  console.log(`\n${BOLD}═══════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  SCENARIO COMPLETE: ${scenario.name}${RESET}`);
  console.log(`${BOLD}  Duration: ${elapsed.toFixed(1)}s${RESET}`);
  console.log(`${BOLD}  Total Requests: ${totalRequests}${RESET}`);
  console.log(`${BOLD}  Avg Throughput: ${avgThroughput.toFixed(2)} req/s${RESET}`);
  console.log(`${BOLD}  Total Errors: ${totalErrors}${RESET}`);
  console.log(`${BOLD}  Passed: ${passedEndpoints}/${allResults.length} endpoints${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════${RESET}\n`);

  // Save results
  const scenarioResult: ScenarioResult = {
    scenario: scenario.name,
    timestamp: new Date().toISOString(),
    duration: elapsed,
    endpoints: allResults,
    summary: {
      totalRequests,
      totalErrors,
      avgThroughput,
      passedEndpoints,
      failedEndpoints: allResults.length - passedEndpoints,
    },
  };

  await saveResults(scenarioResult);

  // Clean up test users
  console.log(`\nCleaning up ${sessions.length} test users...`);
  await Promise.all(sessions.map(s => cleanupUser(s.userId)));
  console.log(`${PASS_EMOJI} Cleanup complete`);

  // Exit with appropriate code
  if (allResults.some(r => !r.passed)) {
    console.log(`${WARN_EMOJI} Some endpoints exceeded performance budgets\n`);
    process.exit(0);
  } else {
    console.log(`${PASS_EMOJI} All endpoints within performance budgets!\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`\n${FAIL_EMOJI} Fatal error:`, err);
  process.exit(1);
});