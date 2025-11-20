import { Injectable } from '@nestjs/common';
import { Connection, ConnectionStatus, JobKind, Prisma, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TokenCipherService } from '../security/token-cipher.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionStatusDto } from './dto/update-connection-status.dto';
import { ConnectionsOverviewDto } from './dto/connections-overview.dto';

interface ListConnectionsOptions {
  tenantId: string;
  userId?: string;
  platform?: SocialPlatform;
}

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCipher: TokenCipherService,
    private readonly jobs: JobsService
  ) {}

  async create(dto: CreateConnectionDto) {
    const sanitizedMetadata = {
      ...(dto.metadata ?? {}),
      scopes: dto.scopes
    };

    const data: Prisma.ConnectionCreateInput = {
      tenant: {
        connect: { id: dto.tenantId }
      },
      user: {
        connect: { id: dto.userId }
      },
      platform: dto.platform,
      accountHandle: dto.accountHandle,
      accountDisplayName: dto.accountDisplayName,
      externalAccountId: dto.externalAccountId,
      accessTokenEncrypted: this.tokenCipher.encrypt(dto.accessToken),
      refreshTokenEncrypted: dto.refreshToken
        ? this.tokenCipher.encrypt(dto.refreshToken)
        : null,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      metadata: sanitizedMetadata
    };

    const connection = await this.prisma.connection.create({ data });

    if (dto.platform === SocialPlatform.TIKTOK) {
      await this.jobs.scheduleJob({
        tenantId: dto.tenantId,
        userId: dto.userId,
        kind: JobKind.TIKTOK_SYNC,
        sourceConnectionId: connection.id,
        payload: {
          reason: 'initial-sync',
          platform: dto.platform
        }
      });
    }

    return this.toResponse(connection);
  }

  async list(options: ListConnectionsOptions) {
    const { tenantId, userId, platform } = options;
    const connections = await this.prisma.connection.findMany({
      where: {
        tenantId,
        userId,
        platform
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return connections.map((connection) => this.toResponse(connection));
  }

  async overview(options: ConnectionsOverviewDto) {
    const where = options.tenantId ? { tenantId: options.tenantId } : undefined;
    const now = Date.now();
    const nextDay = new Date(now + 24 * 60 * 60 * 1000);

    const [totalConnections, expiringSoon, grouped, recent] = await Promise.all([
      this.prisma.connection.count({ where }),
      this.prisma.connection.count({
        where: {
          ...where,
          expiresAt: {
            not: null,
            lte: nextDay
          }
        }
      }),
      this.prisma.connection.groupBy({
        by: ['platform', 'status'],
        where,
        _count: { _all: true }
      }),
      this.prisma.connection.findMany({
        where,
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          tenantId: true,
          userId: true,
          platform: true,
          accountHandle: true,
          accountDisplayName: true,
          status: true,
          expiresAt: true,
          lastSyncedAt: true,
          updatedAt: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      })
    ]);

    return {
      totalConnections,
      expiringWithin24h: expiringSoon,
      byPlatform: this.buildPlatformSummary(grouped),
      recent: recent.map((connection) => ({
        id: connection.id,
        tenantId: connection.tenantId,
        tenant: connection.tenant,
        userId: connection.userId,
        platform: connection.platform,
        accountHandle: connection.accountHandle,
        accountDisplayName: connection.accountDisplayName,
        status: connection.status,
        expiresAt: connection.expiresAt,
        lastSyncedAt: connection.lastSyncedAt,
        updatedAt: connection.updatedAt
      }))
    };
  }

  async updateStatus(connectionId: string, dto: UpdateConnectionStatusDto) {
    const existing = await this.prisma.connection.findUniqueOrThrow({
      where: { id: connectionId },
      select: { metadata: true }
    });

    const existingMetadata = (existing.metadata as Record<string, unknown> | null) ?? undefined;

    const updateData: Prisma.ConnectionUpdateInput = {
      status: dto.status
    };

    if (dto.errorMessage) {
      updateData.metadata = {
        ...(existingMetadata ?? {}),
        lastErrorMessage: dto.errorMessage,
        lastErrorAt: new Date().toISOString()
      } as Prisma.InputJsonValue;
    } else if (dto.status === 'ACTIVE' && existingMetadata) {
      const sanitized: Prisma.JsonObject = {
        ...(existingMetadata as Prisma.JsonObject)
      };
      delete sanitized.lastErrorMessage;
      delete sanitized.lastErrorAt;
      updateData.metadata = Object.keys(sanitized).length
        ? (sanitized as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }

    const connection = await this.prisma.connection.update({
      where: { id: connectionId },
      data: updateData
    });

    return this.toResponse(connection);
  }

  private buildPlatformSummary(
    groups: Array<{
      platform: SocialPlatform;
      status: ConnectionStatus;
      _count: { _all: number };
    }>
  ) {
    const summary: Record<
      SocialPlatform,
      {
        platform: SocialPlatform;
        total: number;
        status: Record<ConnectionStatus, number>;
      }
    > = {
      TIKTOK: {
        platform: SocialPlatform.TIKTOK,
        total: 0,
        status: {
          ACTIVE: 0,
          EXPIRED: 0,
          ERROR: 0,
          REVOKED: 0
        }
      },
      INSTAGRAM: {
        platform: SocialPlatform.INSTAGRAM,
        total: 0,
        status: {
          ACTIVE: 0,
          EXPIRED: 0,
          ERROR: 0,
          REVOKED: 0
        }
      },
      YOUTUBE: {
        platform: SocialPlatform.YOUTUBE,
        total: 0,
        status: {
          ACTIVE: 0,
          EXPIRED: 0,
          ERROR: 0,
          REVOKED: 0
        }
      },
      TWITTER: {
        platform: SocialPlatform.TWITTER,
        total: 0,
        status: {
          ACTIVE: 0,
          EXPIRED: 0,
          ERROR: 0,
          REVOKED: 0
        }
      }
    };

    for (const group of groups) {
      const bucket = summary[group.platform];
      if (!bucket) {
        continue;
      }
      bucket.total += group._count._all;
      bucket.status[group.status] += group._count._all;
    }

    return Object.values(summary);
  }

  private toResponse(connection: Connection) {
    const metadata = this.sanitizeMetadata(connection.metadata);

    return {
      id: connection.id,
      tenantId: connection.tenantId,
      userId: connection.userId,
      platform: connection.platform,
      accountHandle: connection.accountHandle,
      accountDisplayName: connection.accountDisplayName,
      status: connection.status,
      expiresAt: connection.expiresAt,
      lastSyncedAt: connection.lastSyncedAt,
      scopes: connection.scopes,
      metadata,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    };
  }

  async delete(connectionId: string, user: { id: string; tenantId: string; role: string }) {
    // Find the connection and verify ownership
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: user.tenantId,
        ...(user.role !== 'ADMIN' ? { userId: user.id } : {})
      }
    });

    if (!connection) {
      throw new Error('Connection not found or access denied');
    }

    // Delete the connection
    await this.prisma.connection.delete({
      where: { id: connectionId }
    });

    return { success: true, message: 'Connection deleted successfully' };
  }

  private sanitizeMetadata(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const cloned = { ...(metadata as Record<string, unknown>) };
    delete cloned['secrets'];
    return Object.keys(cloned).length ? cloned : undefined;
  }
}
