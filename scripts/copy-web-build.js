#!/usr/bin/env node
const { cp, rm, stat } = require('node:fs/promises');
const { join } = require('node:path');

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function main() {
  const root = process.cwd();
  const source = join(root, 'apps', 'web', 'out');
  const destination = join(root, 'apps', 'api', 'dist', 'apps', 'api', 'client');

  const hasSource = await pathExists(source);
  if (!hasSource) {
    throw new Error(`Expected static export at ${source}, but directory was not found`);
  }

  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true, force: true });

  console.log(`Copied web build from "${source}" to "${destination}"`);
}

main().catch((error) => {
  console.error('[copy-web-build] Failed to copy static web assets', error);
  process.exit(1);
});
