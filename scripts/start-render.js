#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

function runProcess(command, args, name, cwd) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: cwd || process.cwd()
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exit(code ?? 1);
    } else {
      console.log(`${name} exited`);
    }
  });

  return child;
}

// Check if dist files exist (nested workspace structure)
const apiDist = resolve(__dirname, '../apps/api/dist/apps/api/src/main.js');
const workerDist = resolve(__dirname, '../apps/worker/dist/apps/worker/src/main.js');

if (!existsSync(apiDist)) {
  console.error(`ERROR: API dist file not found at ${apiDist}`);
  console.error('Build may have failed. Check build logs.');
  process.exit(1);
}

if (!existsSync(workerDist)) {
  console.error(`ERROR: Worker dist file not found at ${workerDist}`);
  console.error('Build may have failed. Check build logs.');
  process.exit(1);
}

console.log('✓ API dist found:', apiDist);
console.log('✓ Worker dist found:', workerDist);

console.log('Starting autorepost API...');
const api = runProcess('npm', ['start'], 'API', resolve(__dirname, '../apps/api'));

console.log('Starting autorepost worker...');
const worker = runProcess('npm', ['start'], 'Worker', resolve(__dirname, '../apps/worker'));

const shutdown = () => {
  console.log('Shutting down services...');
  api.kill();
  worker.kill();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
