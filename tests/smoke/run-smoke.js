#!/usr/bin/env node
/**
 * Basic smoke test runner.
 *
 * Usage:
 *   SMOKE_API_URL=https://staging-api.example.com \
 *   SMOKE_WORKER_METRICS=https://staging-worker.example.com/metrics \
 *   npm run smoke:test
 */

const API_URL = process.env.SMOKE_API_URL ?? 'http://localhost:4000';
const WORKER_METRICS_URL = process.env.SMOKE_WORKER_METRICS;

async function checkEndpoint(url, name) {
  try {
    const response = await fetch(url, { method: 'GET', timeout: 10_000 });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const body =
      contentType.includes('application/json') ? await response.json() : await response.text();

    console.log(`✓ ${name} (${url})`);
    return { name, ok: true, body };
  } catch (error) {
    console.error(`✗ ${name} (${url}) -> ${error.message}`);
    return { name, ok: false, error };
  }
}

(async () => {
  const checks = [];
  checks.push(await checkEndpoint(`${API_URL}/health`, 'API health'));
  checks.push(await checkEndpoint(`${API_URL}/metrics`, 'API metrics'));

  if (WORKER_METRICS_URL) {
    checks.push(await checkEndpoint(WORKER_METRICS_URL, 'Worker metrics'));
  }

  const failures = checks.filter((check) => !check.ok);
  if (failures.length > 0) {
    process.exitCode = 1;
    console.error(`Smoke tests failed (${failures.length}/${checks.length}).`);
    failures.forEach((failure) => console.error(` - ${failure.name}`));
  } else {
    console.log(`All smoke checks passed (${checks.length}).`);
  }
})();
