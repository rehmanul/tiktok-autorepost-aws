import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('supabase.url');
    const serviceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');

    if (!url || !serviceRoleKey) {
      throw new Error('Supabase URL and service role key must be configured');
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async getUserFromToken(token: string) {
    const {
      data: { user },
      error
    } = await this.client.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user;
  }

  async createUser(email: string, password: string, metadata?: Record<string, any>) {
    const {
      data: { user },
      error
    } = await this.client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });

    if (error) {
      throw new Error(`Failed to create Supabase user: ${error.message}`);
    }

    return user;
  }

  async updateUser(userId: string, updates: { email?: string; metadata?: Record<string, any> }) {
    const {
      data: { user },
      error
    } = await this.client.auth.admin.updateUserById(userId, updates);

    if (error) {
      throw new Error(`Failed to update Supabase user: ${error.message}`);
    }

    return user;
  }

  async deleteUser(userId: string) {
    const {
      data: { user },
      error
    } = await this.client.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(`Failed to delete Supabase user: ${error.message}`);
    }

    return user;
  }
}

