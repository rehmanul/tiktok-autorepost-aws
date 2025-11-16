import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ListAuditEventsDto } from './dto/list-audit-events.dto';

interface AuditEventListItem {
  id: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  action: string;
  metadata?: Prisma.JsonValue;
  createdAt: Date;
}

export interface AuditEventListResult {
  items: AuditEventListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditEvents(dto: ListAuditEventsDto): Promise<AuditEventListResult> {
    const take = Math.min(dto.limit ?? 50, 200);

    const events = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: dto.tenantId,
        createdAt: dto.since ? { gte: dto.since } : undefined
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      take: take + 1,
      cursor: dto.cursor ? { id: dto.cursor } : undefined,
      skip: dto.cursor ? 1 : undefined,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            displayName: true
          }
        }
      }
    });

    const hasMore = events.length > take;
    const pageItems = hasMore ? events.slice(0, take) : events;
    const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

    return {
      items: pageItems.map((event) => ({
        id: event.id,
        tenant: event.tenant,
        user: event.user,
        action: event.action,
        metadata: this.sanitiseMetadata(event.metadata),
        createdAt: event.createdAt
      })),
      nextCursor,
      hasMore
    };
  }

  private sanitiseMetadata(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }
    return metadata;
  }

  async getRecentPosts(tenantId: string, userId: string, userRole: string, limit: number = 50) {
    const where: Prisma.RepostActivityWhereInput = {
      postLog: {
        tenantId: tenantId
      }
    };

    // Non-admin users can only see their own posts
    if (userRole !== 'ADMIN') {
      where.postLog = {
        ...where.postLog,
        userId: userId
      };
    }

    const repostActivities = await this.prisma.repostActivity.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.min(limit, 200),
      include: {
        postLog: {
          select: {
            id: true,
            tiktokUrl: true,
            caption: true,
            sourcePublishedAt: true,
            sourceConnection: {
              select: {
                accountHandle: true,
                platform: true
              }
            }
          }
        },
        destination: {
          select: {
            connection: {
              select: {
                platform: true,
                accountHandle: true
              }
            }
          }
        }
      }
    });

    return repostActivities.map((activity) => ({
      id: activity.id,
      status: activity.status,
      tiktokUrl: activity.postLog.tiktokUrl,
      tiktokHandle: activity.postLog.sourceConnection.accountHandle,
      repostUrl: activity.repostUrl,
      destinationPlatform: activity.destination.connection.platform,
      destinationHandle: activity.destination.connection.accountHandle,
      caption: activity.postLog.caption,
      publishedAt: activity.postLog.sourcePublishedAt,
      completedAt: activity.completedAt,
      errorMessage: activity.errorMessage,
      createdAt: activity.createdAt
    }));
  }
}
