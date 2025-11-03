import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SupabaseService } from './supabase.service';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, AccountStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: UserRole;
  status: AccountStatus;
  displayName: string;
  supabaseUserId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    tenantId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private supabase: SupabaseService,
    private jwtService: JwtService
  ) {}

  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const supabaseClient = this.supabase.getClient();

    const {
      data: { session, user: supabaseUser },
      error
    } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error || !session || !supabaseUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
      include: { tenant: true }
    });

    if (!dbUser) {
      throw new NotFoundException('User not found in database');
    }

    if (dbUser.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLoginAt: new Date() }
    });

    const refreshToken = uuidv4();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    await this.prisma.userSession.create({
      data: {
        userId: dbUser.id,
        refreshToken,
        ipAddress,
        userAgent,
        validUntil
      }
    });

    const accessToken = this.jwtService.sign({
      sub: dbUser.id,
      email: dbUser.email,
      tenantId: dbUser.tenantId,
      role: dbUser.role,
      supabaseUserId: supabaseUser.id
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
        role: dbUser.role,
        tenantId: dbUser.tenantId
      }
    };
  }

  async signup(email: string, password: string, displayName: string, tenantId: string): Promise<LoginResponse> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } }
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const supabaseUser = await this.supabase.createUser(email, password, {
      display_name: displayName,
      tenant_id: tenantId
    });

    if (!supabaseUser) {
      throw new BadRequestException('Failed to create user in Supabase');
    }

    const dbUser = await this.prisma.user.create({
      data: {
        email,
        displayName,
        tenantId,
        supabaseUserId: supabaseUser.id,
        role: UserRole.USER,
        status: AccountStatus.ACTIVE
      },
      include: { tenant: true }
    });

    const refreshToken = uuidv4();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    await this.prisma.userSession.create({
      data: {
        userId: dbUser.id,
        refreshToken,
        validUntil
      }
    });

    const accessToken = this.jwtService.sign({
      sub: dbUser.id,
      email: dbUser.email,
      tenantId: dbUser.tenantId,
      role: dbUser.role,
      supabaseUserId: supabaseUser.id
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: dbUser.displayName,
        role: dbUser.role,
        tenantId: dbUser.tenantId
      }
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || session.validUntil < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const accessToken = this.jwtService.sign({
      sub: session.user.id,
      email: session.user.email,
      tenantId: session.user.tenantId,
      role: session.user.role,
      supabaseUserId: session.user.supabaseUserId
    });

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { refreshToken }
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { userId }
    });
  }

  async validateUser(payload: any): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true }
    });

    if (!user || user.status !== AccountStatus.ACTIVE) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      status: user.status,
      displayName: user.displayName,
      supabaseUserId: user.supabaseUserId
    };
  }
}

