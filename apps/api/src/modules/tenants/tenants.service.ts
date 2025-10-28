import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ListTenantsDto } from './dto/list-tenants.dto';

interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
  connectionCount: number;
  ruleCount: number;
  lastActivityAt: Date | null;
}

interface TenantListResult {
  items: TenantListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: ListTenantsDto): Promise<TenantListResult> {
    const take = Math.min(dto.limit ?? 50, 200);
    const search = dto.search?.trim();

    const tenants = await this.prisma.tenant.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } }
            ]
          }
        : undefined,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      take: take + 1,
      cursor: dto.cursor ? { id: dto.cursor } : undefined,
      skip: dto.cursor ? 1 : undefined,
      include: {
        _count: {
          select: {
            users: true,
            connections: true,
            rules: true
          }
        },
        auditEvents: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            createdAt: true
          }
        },
        jobs: {
          orderBy: {
            updatedAt: 'desc'
          },
          take: 1,
          select: {
            updatedAt: true
          }
        }
      }
    });

    const hasMore = tenants.length > take;
    const pageItems = hasMore ? tenants.slice(0, take) : tenants;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

    return {
      items: pageItems.map((tenant) => {
        const latestAudit = tenant.auditEvents[0]?.createdAt ?? null;
        const latestJob = tenant.jobs[0]?.updatedAt ?? null;
        const lastActivityAt = this.latestDate(latestAudit, latestJob);

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
          userCount: tenant._count.users,
          connectionCount: tenant._count.connections,
          ruleCount: tenant._count.rules,
          lastActivityAt
        };
      }),
      nextCursor,
      hasMore
    };
  }

  private latestDate(...dates: Array<Date | null | undefined>) {
    const filtered = dates.filter((value): value is Date => Boolean(value));
    if (!filtered.length) {
      return null;
    }
    return filtered.sort((a, b) => b.getTime() - a.getTime())[0];
  }
}
