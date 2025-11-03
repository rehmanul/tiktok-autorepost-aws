import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ListUsersDto } from './dto/list-users.dto';

interface UserListItem {
  id: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  email: string;
  displayName: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  connectionCount: number;
  ruleCount: number;
  jobCount: number;
  lastActivityAt: Date | null;
}

export interface UserListResult {
  items: UserListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: ListUsersDto): Promise<UserListResult> {
    const take = Math.min(dto.limit ?? 50, 200);
    const search = dto.search?.trim();

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: dto.tenantId,
        status: dto.status,
        role: dto.role,
        ...(search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { displayName: { contains: search, mode: 'insensitive' } }
              ]
            }
          : undefined)
      },
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
            connections: true,
            rules: true,
            jobs: true
          }
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
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
        }
      }
    });

    const hasMore = users.length > take;
    const pageItems = hasMore ? users.slice(0, take) : users;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

    return {
      items: pageItems.map((user) => ({
        id: user.id,
        tenant: user.tenant,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        connectionCount: user._count.connections,
        ruleCount: user._count.rules,
        jobCount: user._count.jobs,
        lastActivityAt: user.auditEvents[0]?.createdAt ?? null
      })),
      nextCursor,
      hasMore
    };
  }
}
