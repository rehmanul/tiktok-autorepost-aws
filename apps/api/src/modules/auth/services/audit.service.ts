import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(tenantId: string, userId: string | null, action: string, metadata?: Record<string, any>) {
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        userId,
        action,
        metadata: metadata ?? undefined
      }
    });
  }

  async logUserAction(tenantId: string, userId: string, action: string, metadata?: Record<string, any>) {
    await this.log(tenantId, userId, action, metadata);
  }

  async logAdminAction(tenantId: string, adminId: string, action: string, metadata?: Record<string, any>) {
    await this.log(tenantId, adminId, `admin:${action}`, metadata);
  }
}

