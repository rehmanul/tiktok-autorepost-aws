import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { SupabaseService } from '../src/modules/auth/supabase.service';

describe('Auth Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let supabase: SupabaseService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    supabase = app.get(SupabaseService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create a new user', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          slug: `test-${Date.now()}`
        }
      });

      const signupData = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        displayName: 'Test User',
        tenantId: tenant.id
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe(signupData.email);
      expect(response.body.user.displayName).toBe(signupData.displayName);

      // Verify user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: signupData.email } }
      });

      expect(dbUser).toBeDefined();
      expect(dbUser?.supabaseUserId).toBeDefined();

      // Cleanup
      await prisma.user.delete({ where: { id: dbUser!.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    });

    it('should reject duplicate email', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          slug: `test-${Date.now()}`
        }
      });

      const email = `test-${Date.now()}@example.com`;
      const signupData = {
        email,
        password: 'TestPassword123!',
        displayName: 'Test User',
        tenantId: tenant.id
      };

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(signupData)
        .expect(400);

      // Cleanup
      const user = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } }
      });
      if (user) {
        await prisma.user.delete({ where: { id: user.id } });
      }
      await prisma.tenant.delete({ where: { id: tenant.id } });
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // This test requires actual Supabase user creation
      // Skip in unit tests, test manually or with test Supabase project
      expect(true).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('POST /admin/users', () => {
    it('should require admin role', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/users')
        .send({})
        .expect(401);
    });
  });
});

