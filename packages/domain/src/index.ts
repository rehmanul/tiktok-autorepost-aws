export enum UserRole {
  Admin = 'ADMIN',
  User = 'USER'
}

export enum AccountStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Invited = 'INVITED'
}

export enum SocialPlatform {
  TikTok = 'TIKTOK',
  Instagram = 'INSTAGRAM',
  YouTube = 'YOUTUBE',
  Twitter = 'TWITTER'
}

export enum ConnectionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Error = 'ERROR',
  Revoked = 'REVOKED'
}

export enum RepostStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED'
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface ConnectionSummary {
  id: string;
  platform: SocialPlatform;
  handle: string;
  status: ConnectionStatus;
  connectedAt: Date;
  expiresAt?: Date;
}

export interface AutoPostRuleSummary {
  id: string;
  name?: string;
  sourceConnectionId: string;
  destinationConnectionIds: string[];
  isActive: boolean;
  createdAt: Date;
}
