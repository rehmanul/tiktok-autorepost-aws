import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ActivityModule } from '../src/modules/activity/activity.module';
import { ActivityService } from '../src/modules/activity/activity.service';
import { PrismaService } from '../src/modules/database/prisma.service';
import { TenantsModule } from '../src/modules/tenants/tenants.module';
import { TenantsService } from '../src/modules/tenants/tenants.service';
import { UsersModule } from '../src/modules/users/users.module';
import { UsersService } from '../src/modules/users/users.service';

type TenantRecord = ReturnType<typeof createTenantRecord>;
type UserRecord = ReturnType<typeof createUserRecord>;
type AuditRecord = ReturnType<typeof createAuditRecord>;

describe('Pagination-enabled endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prismaMock = createPrismaMock();

    const moduleRef = await Test.createTestingModule({
      imports: [TenantsModule, UsersModule, ActivityModule]
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /tenants supports cursor pagination', async () => {
    const firstPage = await request(app.getHttpServer())
      .get('/tenants')
      .query({ limit: 2 })
      .expect(200);

    expect(firstPage.body.items).toHaveLength(2);
    expect(firstPage.body.items[0].id).toBe('tenant-3');
    expect(firstPage.body.nextCursor).toBe('tenant-2');
    expect(firstPage.body.hasMore).toBe(true);

    const secondPage = await request(app.getHttpServer())
      .get('/tenants')
      .query({ limit: 2, cursor: firstPage.body.nextCursor })
      .expect(200);

    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].id).toBe('tenant-1');
    expect(secondPage.body.hasMore).toBe(false);
    expect(secondPage.body.nextCursor).toBeNull();
  });

  it('GET /users honours tenant filter and pagination', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .query({ tenantId: 'tenant-2', limit: 1 })
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].tenant.slug).toBe('tenant-2');
    expect(response.body.hasMore).toBe(true);

    const next = await request(app.getHttpServer())
      .get('/users')
      .query({ tenantId: 'tenant-2', limit: 1, cursor: response.body.nextCursor })
      .expect(200);

    expect(next.body.items).toHaveLength(1);
    expect(next.body.hasMore).toBe(false);
  });

  it('GET /activity/audit paginates audit events', async () => {
    const response = await request(app.getHttpServer())
      .get('/activity/audit')
      .query({ limit: 2 })
      .expect(200);

    expect(response.body.items).toHaveLength(2);
    expect(response.body.hasMore).toBe(true);

    const next = await request(app.getHttpServer())
      .get('/activity/audit')
      .query({ limit: 2, cursor: response.body.nextCursor })
      .expect(200);

    expect(next.body.items).toHaveLength(1);
    expect(next.body.hasMore).toBe(false);
  });
});

function createTenantRecord(id: string, createdAt: Date) {
  return {
    id,
    name: `Tenant ${id}`,
    slug: id,
    createdAt,
    updatedAt: createdAt,
    _count: {
      users: Number(id.split('-')[1]),
      connections: Number(id.split('-')[1]) + 1,
      rules: Number(id.split('-')[1]) + 2
    },
    auditEvents: [{ createdAt }],
    jobs: [{ updatedAt: createdAt }]
  };
}

function createUserRecord(id: string, tenant: TenantRecord, createdAt: Date) {
  return {
    id,
    tenantId: tenant.id,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    },
    email: `${id}@example.com`,
    displayName: `User ${id}`,
    role: 'ADMIN',
    status: 'ACTIVE',
    lastLoginAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    _count: {
      connections: 2,
      rules: 3,
      jobs: 4
    },
    auditEvents: [{ createdAt }]
  };
}

function createAuditRecord(id: string, tenant: TenantRecord, user: UserRecord, createdAt: Date) {
  return {
    id,
    tenantId: tenant.id,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    },
    userId: user.id,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    },
    action: `action:${id}`,
    metadata: { note: id },
    createdAt
  };
}

function sortByCreatedAt<T extends { createdAt: Date; id: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const diff = b.createdAt.getTime() - a.createdAt.getTime();
    if (diff !== 0) {
      return diff;
    }
    return b.id.localeCompare(a.id);
  });
}

function applyCursorPagination<T extends { id: string; createdAt: Date }>(
  items: T[],
  args: { take?: number; cursor?: { id: string }; skip?: number }
) {
  const sorted = sortByCreatedAt(items);
  const take = args.take ?? sorted.length;
  const skip = args.skip ?? 0;

  let startIndex = 0;
  if (args.cursor?.id) {
    const cursorIndex = sorted.findIndex((item) => item.id === args.cursor?.id);
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + skip;
    }
  }

  return sorted.slice(startIndex, startIndex + take);
}

function createPrismaMock(): PrismaService {
  const tenantRecords = [
    createTenantRecord('tenant-1', new Date('2025-01-01T00:00:00Z')),
    createTenantRecord('tenant-2', new Date('2025-02-01T00:00:00Z')),
    createTenantRecord('tenant-3', new Date('2025-03-01T00:00:00Z'))
  ];

  const userRecords = [
    createUserRecord('user-1', tenantRecords[0], new Date('2025-03-10T00:00:00Z')),
    createUserRecord('user-2', tenantRecords[1], new Date('2025-03-09T00:00:00Z')),
    createUserRecord('user-3', tenantRecords[1], new Date('2025-03-08T00:00:00Z')),
    createUserRecord('user-4', tenantRecords[2], new Date('2025-03-07T00:00:00Z'))
  ];

  const auditRecords = [
    createAuditRecord('audit-1', tenantRecords[0], userRecords[0], new Date('2025-03-05T00:00:00Z')),
    createAuditRecord('audit-2', tenantRecords[1], userRecords[1], new Date('2025-03-04T00:00:00Z')),
    createAuditRecord('audit-3', tenantRecords[2], userRecords[3], new Date('2025-03-03T00:00:00Z'))
  ];

  const prismaMock: any = {
    tenant: {
      findMany: async (args: any) => {
        let results = [...tenantRecords];
        const keyword = (args?.where?.OR ?? [])
          .map((condition: any) => condition?.name?.contains ?? condition?.slug?.contains)
          .find(Boolean);
        if (keyword) {
          const lower = String(keyword).toLowerCase();
          results = results.filter(
            (tenant) =>
              tenant.name.toLowerCase().includes(lower) || tenant.slug.toLowerCase().includes(lower)
          );
        }
        const paged = applyCursorPagination(results, {
          take: args?.take,
          cursor: args?.cursor,
          skip: args?.skip
        });
        return paged;
      }
    },
    user: {
      findMany: async (args: any) => {
        let results = [...userRecords];
        if (args?.where?.tenantId) {
          results = results.filter((user) => user.tenantId === args.where.tenantId);
        }
        const searchKeyword = (args?.where?.OR ?? [])
          .map((condition: any) => condition?.email?.contains ?? condition?.displayName?.contains)
          .find(Boolean);
        if (searchKeyword) {
          const lower = String(searchKeyword).toLowerCase();
          results = results.filter(
            (user) =>
              user.email.toLowerCase().includes(lower) ||
              user.displayName.toLowerCase().includes(lower)
          );
        }
        const paged = applyCursorPagination(results, {
          take: args?.take,
          cursor: args?.cursor,
          skip: args?.skip
        });
        return paged;
      }
    },
    auditEvent: {
      findMany: async (args: any) => {
        let results = [...auditRecords];
        if (args?.where?.tenantId) {
          results = results.filter((event) => event.tenantId === args.where.tenantId);
        }
        if (args?.where?.createdAt?.gte) {
          const threshold = args.where.createdAt.gte as Date;
          results = results.filter((event) => event.createdAt >= threshold);
        }
        const paged = applyCursorPagination(results, {
          take: args?.take,
          cursor: args?.cursor,
          skip: args?.skip
        });
        return paged;
      }
    },
    enableShutdownHooks: () => undefined,
    $connect: async () => undefined,
    $disconnect: async () => undefined
  };

  return prismaMock as PrismaService;
}
