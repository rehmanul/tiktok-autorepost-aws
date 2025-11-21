import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobKind, Prisma, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { ListRulesDto } from './dto/list-rules.dto';

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService
  ) {}

  async create(dto: CreateRuleDto) {
    const sourceConnection = await this.prisma.connection.findFirst({
      where: {
        id: dto.sourceConnectionId,
        tenantId: dto.tenantId,
        userId: dto.userId
      },
      select: {
        id: true,
        platform: true,
        status: true
      }
    });

    if (!sourceConnection) {
      throw new NotFoundException('Source connection not found for user/tenant');
    }

    if (sourceConnection.platform !== SocialPlatform.TIKTOK) {
      throw new BadRequestException('Source connection must be a TikTok account');
    }

    const destinationConnections = await this.prisma.connection.findMany({
      where: {
        id: { in: dto.destinationConnectionIds },
        tenantId: dto.tenantId,
        userId: dto.userId
      },
      select: { id: true, platform: true, status: true }
    });

    if (destinationConnections.length !== dto.destinationConnectionIds.length) {
      throw new NotFoundException('One or more destination connections were not found');
    }

    const invalidDestinations = destinationConnections.filter(
      (connection) => connection.platform === SocialPlatform.TIKTOK
    );
    if (invalidDestinations.length) {
      throw new BadRequestException('Destination connections cannot be TikTok accounts');
    }

    const rule = await this.prisma.$transaction(async (tx) => {
      const created = await tx.autoPostRule.create({
        data: {
          tenantId: dto.tenantId,
          userId: dto.userId,
          sourceConnectionId: dto.sourceConnectionId,
          name: dto.name,
          isActive: dto.isActive ?? true,
          destinations: {
            create: dto.destinationConnectionIds.map((connectionId) => ({
              connectionId
            }))
          }
        },
        include: {
          destinations: true
        }
      });

      return created;
    });

    // Try to schedule a job, but don't fail rule creation if queue is unavailable
    try {
      await this.jobs.scheduleJob({
        tenantId: dto.tenantId,
        userId: dto.userId,
        kind: JobKind.TIKTOK_SYNC,
        sourceConnectionId: dto.sourceConnectionId,
        ruleId: rule.id,
        payload: {
          reason: 'rule-created',
          triggerConnectionStatus: sourceConnection.status
        }
      });
    } catch (error) {
      // Log error but don't fail rule creation
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to schedule job for rule creation:', errorMessage);
    }

    return this.toResponse(rule);
  }

  async list(dto: ListRulesDto) {
    const includeInactive = dto.includeInactive === 'true';
    const rules = await this.prisma.autoPostRule.findMany({
      where: {
        tenantId: dto.tenantId,
        userId: dto.userId,
        isActive: includeInactive ? undefined : true
      },
      include: {
        destinations: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return rules.map((rule) => this.toResponse(rule));
  }

  private toResponse(
    rule: Prisma.AutoPostRuleGetPayload<{
      include: { destinations: true };
    }>
  ) {
    return {
      id: rule.id,
      tenantId: rule.tenantId,
      userId: rule.userId,
      sourceConnectionId: rule.sourceConnectionId,
      destinationConnectionIds: rule.destinations.map((destination) => destination.connectionId),
      name: rule.name,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    };
  }
}
