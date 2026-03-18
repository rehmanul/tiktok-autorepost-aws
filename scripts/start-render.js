#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { resolve } = require('node:path');

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : 'npm';
const npmBaseArgs = npmExecPath ? [npmExecPath] : [];
const useShellForNpm = process.platform === 'win32' && !npmExecPath;

function runProcess(command, args, name, cwd, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: cwd || process.cwd(),
    shell: options.shell ?? false
  });

  child.on('error', (error) => {
    console.error(`${name} failed to start:`, error);
    process.exit(1);
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

function runNpmScript(scriptName, name, cwd) {
  if (npmExecPath) {
    return runProcess(npmCommand, [...npmBaseArgs, 'run', scriptName], name, cwd);
  }

  // Fallback path for environments where npm_execpath is unavailable.
  if (useShellForNpm) {
    return runProcess(`npm run ${scriptName}`, [], name, cwd, { shell: true });
  }

  return runProcess('npm', ['run', scriptName], name, cwd);
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
const api = runNpmScript('start', 'API', resolve(__dirname, '../apps/api'));

console.log('Starting autorepost worker...');
const worker = runNpmScript('start', 'Worker', resolve(__dirname, '../apps/worker'));

const shutdown = () => {
  console.log('Shutting down services...');
  api.kill();
  worker.kill();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
