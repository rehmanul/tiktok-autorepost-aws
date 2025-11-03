import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/modules/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { SocialPlatform } from '@prisma/client';

describe('OAuth Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /oauth/instagram/start', () => {
    it('should generate authorization URL', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Test Tenant',
          slug: `test-${Date.now()}`
        }
      });

      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          displayName: 'Test User',
          tenantId: tenant.id,
          role: 'USER',
          status: 'ACTIVE'
        }
      });

      const response = await request(app.getHttpServer())
        .get('/api/oauth/instagram/start')
        .query({
          tenantId: tenant.id,
          userId: user.id
        })
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('state');
      expect(response.body.authUrl).toContain('api.instagram.com');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.tenant.delete({ where: { id: tenant.id } });
    });
  });

  describe('POST /oauth/tiktok/connect', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/oauth/tiktok/connect')
        .send({
          tenantId: 'test',
          userId: 'test',
          accountHandle: 'test',
          cookies: 'test'
        })
        .expect(401);
    });
  });
});

