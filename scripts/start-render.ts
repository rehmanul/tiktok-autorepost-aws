import { spawn } from 'node:child_process';

function runProcess(command: string, args: string[], name: string) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env
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

const apiPath = 'apps/api/dist/apps/api/src/main.js';
const workerPath = 'apps/worker/dist/apps/worker/src/main.js';

console.log('Starting autorepost API...');
const api = runProcess('node', [apiPath], 'API');

console.log('Starting autorepost worker...');
const worker = runProcess('node', [workerPath], 'Worker');

const shutdown = () => {
  console.log('Shutting down services...');
  api.kill();
  worker.kill();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
