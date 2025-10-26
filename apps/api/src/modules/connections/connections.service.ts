import { Injectable } from '@nestjs/common';
import { Connection, JobKind, Prisma, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { TokenCipherService } from '../security/token-cipher.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionStatusDto } from './dto/update-connection-status.dto';

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
      const { lastErrorMessage, lastErrorAt, ...rest } = existingMetadata;
      updateData.metadata = Object.keys(rest).length
        ? (rest as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }

    const connection = await this.prisma.connection.update({
      where: { id: connectionId },
      data: updateData
    });

    return this.toResponse(connection);
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

  private sanitizeMetadata(metadata: Prisma.JsonValue | null) {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const cloned = { ...(metadata as Record<string, unknown>) };
    delete cloned['secrets'];
    return Object.keys(cloned).length ? cloned : undefined;
  }
}
