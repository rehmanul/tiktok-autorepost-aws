#!/usr/bin/env ts-node

/**
 * Verify production setup and configuration
 * 
 * Usage: npm run verify:setup
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

interface Check {
  name: string;
  check: () => Promise<boolean>;
  error?: string;
}

const checks: Check[] = [
  {
    name: 'Database connection',
    check: async () => {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    },
    error: 'Cannot connect to database. Check DATABASE_URL'
  },
  {
    name: 'Supabase configuration',
    check: async () => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return false;
      
      const supabase = createClient(url, key);
      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      return !error;
    },
    error: 'Supabase not configured or invalid credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  },
  {
    name: 'Token encryption key',
    check: async () => {
      const key = process.env.TOKEN_ENCRYPTION_KEY;
      if (!key) return false;
      
      try {
        const buffer = Buffer.from(key, 'base64');
        return buffer.length === 32;
      } catch {
        return false;
      }
    },
    error: 'TOKEN_ENCRYPTION_KEY missing or invalid. Run: npm run generate:token-key'
  },
  {
    name: 'Redis connection',
    check: async () => {
      const Redis = (await import('ioredis')).default;
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redisTls = (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true';
      
      const redis = new Redis(redisUrl, { tls: redisTls ? {} : undefined });
      await redis.ping();
      await redis.quit();
      return true;
    },
    error: 'Cannot connect to Redis. Check REDIS_URL and REDIS_TLS'
  },
  {
    name: 'S3/Storage configuration',
    check: async () => {
      const endpoint = process.env.S3_ENDPOINT;
      const bucket = process.env.S3_BUCKET;
      const accessKey = process.env.S3_ACCESS_KEY_ID;
      const secretKey = process.env.S3_SECRET_ACCESS_KEY;
      
      return !!(endpoint && bucket && accessKey && secretKey);
    },
    error: 'S3 configuration incomplete. Check S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY'
  },
  {
    name: 'OAuth credentials',
    check: async () => {
      const hasInstagram = !!(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
      const hasYouTube = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
      const hasTwitter = !!(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET);
      
      // At least one OAuth platform should be configured
      return hasInstagram || hasYouTube || hasTwitter;
    },
    error: 'No OAuth platforms configured. At least one of Instagram, YouTube, or Twitter credentials needed'
  },
  {
    name: 'Database schema',
    check: async () => {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;
      
      const required = ['User', 'Tenant', 'Connection', 'ProcessingJob', 'AutoPostRule'];
      const tableNames = tables.map(t => t.tablename);
      
      return required.every(name => tableNames.includes(name));
    },
    error: 'Database schema incomplete. Run migrations: npx prisma migrate deploy'
  }
];

async function main() {
  console.log('🔍 Verifying production setup...\n');
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const passed = await check.check();
      if (passed) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`❌ ${check.name}`);
        if (check.error) {
          console.log(`   ${check.error}`);
        }
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}`);
      if (check.error) {
        console.log(`   ${check.error}`);
      }
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      allPassed = false;
    }
  }
  
  console.log('');
  
  if (allPassed) {
    console.log('🎉 All checks passed! System is ready for production.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above before deploying.\n');
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

