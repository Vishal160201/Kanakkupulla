#!/usr/bin/env node

/**
 * Performance Budget Checker
 * Reads a perf results JSON file and checks against defined budgets.
 * Exit codes:
 *   0 - All budgets passed or warnings only
 *   1 - Critical budgets exceeded (fail CI)
 */

const fs = require('fs');
const path = require('path');

const RESULT_DIR = path.join(__dirname, '..', 'perf-results');

// Default budgets (ms) - matches perf.config.ts
const DEFAULT_BUDGETS = {
  p50: 250,
  p90: 600,
  p99: 1000,
  maxErrorRate: 0.05, // Allow 5% error rate (some endpoints may not have data)
};

function parseArgs() {
  const args = process.argv.slice(2);
  const resultFile = args[0];
  const mode = args.includes('--strict') ? 'strict' : 'warning';
  return { resultFile, mode };
}

function findLatestResult() {
  if (!fs.existsSync(RESULT_DIR)) {
    console.error('No perf-results directory found');
    return null;
  }

  const files = fs.readdirSync(RESULT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(RESULT_DIR, f),
      mtime: fs.statSync(path.join(RESULT_DIR, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  return files.length > 0 ? files[0] : null;
}

function loadResults(filepath) {
  if (!fs.existsSync(filepath)) {
    console.error(`Results file not found: ${filepath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function checkBudgets(results, mode) {
  const failures = [];
  const warnings = [];
  const { endpoints } = results;

  for (const ep of endpoints) {
    const budgets = DEFAULT_BUDGETS;
    let endpointFailures = [];

    if (ep.latencyP50 > budgets.p50) {
      const msg = `${ep.name}: p50=${ep.latencyP50.toFixed(2)}ms exceeds ${budgets.p50}ms`;
      endpointFailures.push(msg);
    }

    if (ep.latencyP90 > budgets.p90) {
      const msg = `${ep.name}: p90=${ep.latencyP90.toFixed(2)}ms exceeds ${budgets.p90}ms`;
      endpointFailures.push(msg);
    }

    if (ep.latencyP99 > budgets.p99) {
      const msg = `${ep.name}: p99=${ep.latencyP99.toFixed(2)}ms exceeds ${budgets.p99}ms`;
      endpointFailures.push(msg);
    }

    const errorRate = ep.errors / (ep.totalRequests || 1);
    if (errorRate > budgets.maxErrorRate) {
      const msg = `${ep.name}: error rate ${(errorRate * 100).toFixed(2)}% exceeds ${(budgets.maxErrorRate * 100).toFixed(2)}%`;
      endpointFailures.push(msg);
    }

    if (endpointFailures.length > 0) {
      if (mode === 'strict') {
        failures.push(...endpointFailures);
      } else {
        warnings.push(...endpointFailures);
      }
    }
  }

  return { failures, warnings, passed: failures.length === 0 };
}

function formatResults(results, budgetsCheck, mode) {
  const { scenario, timestamp, duration, summary, endpoints } = results;
  const { failures, warnings, passed } = budgetsCheck;

  const lines = [];
  const WARN = '\x1b[33m';
  const FAIL = '\x1b[31m';
  const PASS = '\x1b[32m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';

  lines.push('');
  lines.push(`${BOLD}═══════════════════════════════════════════════${RESET}`);
  lines.push(`${BOLD}  Performance Budget Check Report${RESET}`);
  lines.push(`${BOLD}═══════════════════════════════════════════════${RESET}`);
  lines.push(`  Scenario: ${scenario}`);
  lines.push(`  Timestamp: ${timestamp}`);
  lines.push(`  Duration: ${duration.toFixed(1)}s`);
  lines.push(`  Endpoints: ${endpoints.length}`);
  lines.push('');

  for (const ep of endpoints) {
    const icon = ep.passed ? `${PASS}✓${RESET}` : `${FAIL}✗${RESET}`;
    lines.push(`  ${icon} ${ep.method} ${ep.url}`);
    lines.push(`     Requests/sec: ${ep.requestsPerSec.toFixed(2)}`);
    lines.push(`     Latency: p50=${ep.latencyP50.toFixed(2)}ms | p90=${ep.latencyP90.toFixed(2)}ms | p99=${ep.latencyP99.toFixed(2)}ms`);
    lines.push(`     Errors: ${ep.errors} | Non-2xx: ${ep.non2xx}`);
    lines.push('');
  }

  lines.push(`${BOLD}  Summary${RESET}`);
  lines.push(`  Total Requests: ${summary.totalRequests}`);
  lines.push(`  Total Errors: ${summary.totalErrors}`);
  lines.push(`  Passed: ${summary.passedEndpoints}/${endpoints.length}`);
  lines.push('');

  if (warnings.length > 0) {
    lines.push(`${WARN}  Warnings (budget soft violations):${RESET}`);
    for (const w of warnings) {
      lines.push(`    ${WARN}⚠${RESET} ${w}`);
    }
    lines.push('');
  }

  if (failures.length > 0) {
    lines.push(`${FAIL}  FAILURES (budget hard violations):${RESET}`);
    for (const f of failures) {
      lines.push(`    ${FAIL}✗${RESET} ${f}`);
    }
    lines.push('');
  }

  const finalIcon = passed ? `${PASS}✓${RESET}` : `${FAIL}✗${RESET}`;
  lines.push(`${BOLD}  Result: ${finalIcon} ${passed ? 'ALL BUDGETS PASSED' : 'BUDGETS EXCEEDED'}${RESET}`);
  lines.push(`${BOLD}═══════════════════════════════════════════════${RESET}`);

  return lines.join('\n');
}

function main() {
  const { resultFile, mode } = parseArgs();

  let filepath;
  if (resultFile) {
    filepath = path.resolve(resultFile);
  } else {
    console.log('No results file specified, finding latest...');
    const latest = findLatestResult();
    if (!latest) {
      console.error('No performance results found. Run a test first.');
      process.exit(1);
    }
    filepath = latest.path;
    console.log(`Using latest results: ${latest.name}\n`);
  }

  const results = loadResults(filepath);
  if (!results) process.exit(1);

  const budgetsCheck = checkBudgets(results, mode);
  const report = formatResults(results, budgetsCheck, mode);

  console.log(report);

  if (budgetsCheck.failures.length > 0 && mode === 'strict') {
    process.exit(1);
  }
  process.exit(0);
}

main();