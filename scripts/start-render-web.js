#!/usr/bin/env node

const { spawn } = require('node:child_process');
const { resolve } = require('node:path');

const webCwd = resolve(__dirname, '../apps/web');

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : 'npm';
const npmArgs = npmExecPath ? [npmExecPath, 'run', 'start'] : ['run', 'start'];

const useShellForNpm = process.platform === 'win32' && !npmExecPath;

console.log('Starting Render web dashboard via explicit runner...');
console.log(`Working directory: ${webCwd}`);

const child = spawn(
  useShellForNpm ? 'npm run start' : npmCommand,
  useShellForNpm ? [] : npmArgs,
  {
    cwd: webCwd,
    env: process.env,
    stdio: 'inherit',
    shell: useShellForNpm
  }
);

child.on('error', (error) => {
  console.error('Web dashboard failed to start:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Web dashboard exited due to signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});

