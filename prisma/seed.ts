import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default tenant
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Tenant',
      slug: 'default'
    }
  });

  console.log('✅ Default tenant created/verified');

  // Note: Admin user creation requires Supabase to be set up first
  // Admin user should be created via Supabase Auth first, then linked here
  // Example:
  // const adminUser = await prisma.user.upsert({
  //   where: { tenantId_email: { tenantId: defaultTenant.id, email: 'admin@example.com' } },
  //   update: {},
  //   create: {
  //     email: 'admin@example.com',
  //     displayName: 'Admin User',
  //     tenantId: defaultTenant.id,
  //     supabaseUserId: 'supabase-user-id-here', // From Supabase Auth
  //     role: UserRole.ADMIN,
  //     status: AccountStatus.ACTIVE
  //   }
  // });

  console.log('✅ Seed completed');
  console.log('📝 Note: Create admin user via Supabase Auth, then link with supabaseUserId');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

