import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';

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

  console.log('✅ Default tenant created/verified:', defaultTenant.id);

  console.log('\n📝 Note: Admin user should be created via:');
  console.log('   npm run setup:supabase');
  console.log('\nThis will:');
  console.log('   1. Create user in Supabase Auth');
  console.log('   2. Link user to database with ADMIN role');
  console.log('   3. Set up proper authentication\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

