import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './auth.service';
import { UserRole, AccountStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { SupabaseService } from './supabase.service';
import { AuditService } from './services/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private auditService: AuditService
  ) {}

  @Post('tenants')
  async createTenant(
    @Body() body: { name: string; slug: string },
    @CurrentUser() admin: AuthUser
  ) {
    const slug = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('Tenant with this slug already exists');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: body.name,
        slug
      }
    });

    await this.auditService.logAdminAction(admin.tenantId, admin.id, 'tenant.create', {
      tenantId: tenant.id,
      name: tenant.name
    });

    return tenant;
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() admin: AuthUser) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: dto.tenantId, email: dto.email } }
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const supabaseUser = await this.supabase.createUser(dto.email, dto.password, {
      display_name: dto.displayName,
      tenant_id: dto.tenantId,
      role: dto.role ?? UserRole.USER
    });

    if (!supabaseUser) {
      throw new BadRequestException('Failed to create user in Supabase');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        tenantId: dto.tenantId,
        supabaseUserId: supabaseUser.id,
        role: dto.role ?? UserRole.USER,
        status: dto.status ?? AccountStatus.ACTIVE
      }
    });

    await this.auditService.logAdminAction(admin.tenantId, admin.id, 'user.create', {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      createdAt: user.createdAt
    };
  }

  @Post('users/invite')
  async inviteUser(@Body() dto: InviteUserDto, @CurrentUser() admin: AuthUser) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: dto.tenantId, email: dto.email } }
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const supabaseUser = await this.supabase.createUser(dto.email, tempPassword, {
      display_name: dto.displayName,
      tenant_id: dto.tenantId,
      role: dto.role ?? UserRole.USER,
      invited: true
    });

    if (!supabaseUser) {
      throw new BadRequestException('Failed to create invited user in Supabase');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        tenantId: dto.tenantId,
        supabaseUserId: supabaseUser.id,
        role: dto.role ?? UserRole.USER,
        status: AccountStatus.INVITED
      }
    });

    await this.auditService.logAdminAction(admin.tenantId, admin.id, 'user.invite', {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      createdAt: user.createdAt
    };
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() body: { status: AccountStatus },
    @CurrentUser() admin: AuthUser
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: body.status }
    });

    await this.auditService.logAdminAction(admin.tenantId, admin.id, 'user.status.update', {
      userId: user.id,
      oldStatus: user.status,
      newStatus: body.status
    });

    return {
      id: updated.id,
      email: updated.email,
      status: updated.status
    };
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() body: { role: UserRole },
    @CurrentUser() admin: AuthUser
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: body.role }
    });

    await this.auditService.logAdminAction(admin.tenantId, admin.id, 'user.role.update', {
      userId: user.id,
      oldRole: user.role,
      newRole: body.role
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role
    };
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseUUIDPipe) userId: string, @CurrentUser() admin: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.supabaseUserId) {
      await this.supabase.deleteUser(user.supabaseUserId);
    }

    await this.prisma.user.delete({ where: { id: userId } });

    await this.auditService.logAdminAction(admin.tenantId, admin.id, 'user.delete', {
      userId: user.id,
      email: user.email
    });
  }
}

