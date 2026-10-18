// =============================================================================
// packages/sdk/src/subscriptions.ts — RobinPaySubscriptions API client
// =============================================================================

export interface CreatePlanParams {
  planId: string;
  amount: string;
  interval: 'day' | 'week' | 'month' | 'year';
  token?: 'USDC' | 'ETH';
  merchant?: string;
  gatewayUrl?: string;
}

export const RobinPaySubscriptions = {
  async createPlan(params: CreatePlanParams) {
    // Returns subscription plan definition with Robinhood Chain SubscriptionVault parameter
    return {
      planId: params.planId,
      amount: params.amount,
      interval: params.interval,
      token: params.token || 'USDC',
      chainId: 4663,
      vaultContract: '0x0000000000000000000000000000000000000000',
      active: true,
      createdAt: new Date().toISOString(),
    };
  },
};
