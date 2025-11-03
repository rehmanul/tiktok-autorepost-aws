import { requestJson } from './http';

export interface CreateTenantRequest {
  name: string;
  slug: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  tenantId: string;
  role?: string;
  status?: string;
}

export interface InviteUserRequest {
  email: string;
  displayName: string;
  tenantId: string;
  role?: string;
}

export interface UpdateUserStatusRequest {
  status: string;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export async function createTenant(data: CreateTenantRequest) {
  return requestJson('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createUser(data: CreateUserRequest) {
  return requestJson('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function inviteUser(data: InviteUserRequest) {
  return requestJson('/admin/users/invite', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateUserStatus(userId: string, data: UpdateUserStatusRequest) {
  return requestJson(`/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function updateUserRole(userId: string, data: UpdateUserRoleRequest) {
  return requestJson(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteUser(userId: string) {
  return requestJson(`/admin/users/${userId}`, {
    method: 'DELETE'
  });
}

