#!/usr/bin/env ts-node

/**
 * Generate a secure token encryption key for OAuth tokens
 * 
 * Usage: npm run generate:token-key
 */

import * as crypto from 'crypto';

const key = crypto.randomBytes(32);
const base64Key = key.toString('base64');

console.log('\n✅ Generated TOKEN_ENCRYPTION_KEY:');
console.log(base64Key);
console.log('\n📋 Add this to your .env file:');
console.log(`TOKEN_ENCRYPTION_KEY=${base64Key}\n`);
console.log('⚠️  Store this securely - if lost, all encrypted tokens will be unrecoverable!\n');

