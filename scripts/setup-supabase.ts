#!/usr/bin/env ts-node

/**
 * Supabase Setup Script
 * 
 * This script helps set up the initial admin user in Supabase and links it to the database.
 * 
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npm run setup:supabase
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient, UserRole, AccountStatus } from '@prisma/client';
import * as readline from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const prisma = new PrismaClient();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.log('🚀 Supabase Setup Script\n');

    try {
        // Get or create default tenant
        let tenant = await prisma.tenant.findFirst({
            where: { slug: 'default' }
        });

        if (!tenant) {
            const tenantName = await question('Tenant name (default: "Default Tenant"): ');
            const tenantSlug = await question('Tenant slug (default: "default"): ');

            tenant = await prisma.tenant.create({
                data: {
                    name: tenantName || 'Default Tenant',
                    slug: tenantSlug || 'default'
                }
            });
            console.log(`✅ Created tenant: ${tenant.name}`);
        } else {
            console.log(`✅ Using existing tenant: ${tenant.name}`);
        }

        // Create admin user in Supabase
        console.log('\n📧 Creating admin user in Supabase...');
        const email = await question('Admin email: ');
        const password = await question('Admin password: ');
        const displayName = await question('Display name (default: "Admin"): ') || 'Admin';

        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                display_name: displayName,
                tenant_id: tenant.id,
                role: 'ADMIN'
            }
        });

        if (authError || !authUser.user) {
            throw new Error(`Failed to create Supabase user: ${authError?.message}`);
        }

        console.log(`✅ Created Supabase user: ${authUser.user.id}`);

        // Link to database
        const dbUser = await prisma.user.upsert({
            where: {
                tenantId_email: {
                    tenantId: tenant.id,
                    email
                }
            },
            update: {
                supabaseUserId: authUser.user.id,
                role: UserRole.ADMIN,
                status: AccountStatus.ACTIVE
            },
            create: {
                email,
                displayName,
                tenantId: tenant.id,
                supabaseUserId: authUser.user.id,
                role: UserRole.ADMIN,
                status: AccountStatus.ACTIVE
            }
        });

        console.log(`✅ Linked database user: ${dbUser.id}`);
        console.log('\n🎉 Setup complete!');
        console.log(`\n📋 Credentials:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log(`   Tenant: ${tenant.name} (${tenant.id})`);
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    } finally {
        rl.close();
        await prisma.$disconnect();
    }
}

main();

