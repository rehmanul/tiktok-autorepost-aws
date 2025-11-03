import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../auth.service';
import { UserRole } from '@prisma/client';

export const TENANT_SCOPE_KEY = 'tenantScope';
export const TenantScope = () => Reflector.createDecorator<string>();

/**
 * Guard that enforces tenant scoping for non-admin users
 * Admins can access all tenants, regular users are restricted to their own tenant
 */
@Injectable()
export class TenantScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;

    if (!user) {
      return true; // Let auth guard handle this
    }

    // Admins can access any tenant
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Regular users are restricted to their own tenant
    const queryTenantId = request.query?.tenantId;
    const bodyTenantId = request.body?.tenantId;
    const paramTenantId = request.params?.tenantId;

    const requestedTenantId = queryTenantId || bodyTenantId || paramTenantId;

    // If no tenant specified, default to user's tenant (handled in services)
    if (!requestedTenantId) {
      return true;
    }

    // Regular users can only access their own tenant
    if (requestedTenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied: cannot access resources from other tenants');
    }

    return true;
  }
}

