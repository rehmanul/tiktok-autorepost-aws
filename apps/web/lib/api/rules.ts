import { requestJson } from './http';

export interface AutoPostRule {
  id: string;
  tenantId: string;
  userId: string;
  sourceConnectionId: string;
  destinationConnectionIds: string[];
  name?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleRequest {
  tenantId: string;
  userId: string;
  sourceConnectionId: string;
  destinationConnectionIds: string[];
  name?: string;
  isActive?: boolean;
}

export interface ListRulesRequest {
  tenantId: string;
  userId?: string;
  includeInactive?: boolean;
}

export const rulesApi = {
  async create(data: CreateRuleRequest): Promise<AutoPostRule> {
    return requestJson<AutoPostRule>('/rules', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async list(params: ListRulesRequest): Promise<AutoPostRule[]> {
    const queryParams = new URLSearchParams();
    queryParams.set('tenantId', params.tenantId);
    if (params.userId) {
      queryParams.set('userId', params.userId);
    }
    if (params.includeInactive) {
      queryParams.set('includeInactive', 'true');
    }

    return requestJson<AutoPostRule[]>(`/rules?${queryParams.toString()}`);
  }
};

