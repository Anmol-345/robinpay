// =============================================================================
// packages/sdk/src/invoices.ts — RobinPayInvoices API client
// =============================================================================

export interface CreateInvoiceParams {
  recipient?: string;
  merchant?: string;
  amount: string;
  token?: 'USDC' | 'ETH';
  description?: string;
  externalRef?: string;
  escrow?: boolean;
  milestones?: number | Array<{ title: string; amount: string; releaseInDays: number }>;
  gatewayUrl?: string;
}

export const RobinPayInvoices = {
  async create(params: CreateInvoiceParams) {
    const baseUrl =
      params.gatewayUrl ||
      (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:3000');

    let formattedMilestones: Array<{ title: string; amount: string; releaseInDays: number }> | undefined;
    if (params.escrow && typeof params.milestones === 'number') {
      const count = params.milestones;
      const perMilestone = (parseFloat(params.amount) / count).toFixed(2);
      formattedMilestones = Array.from({ length: count }, (_, i) => ({
        title: `Milestone ${i + 1}`,
        amount: perMilestone,
        releaseInDays: (i + 1) * 7,
      }));
    } else if (Array.isArray(params.milestones)) {
      formattedMilestones = params.milestones;
    }

    const res = await fetch(`${baseUrl}/api/v1/invoices/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: params.recipient || params.merchant,
        amount: params.amount,
        token: params.token || 'USDC',
        description: params.description,
        externalRef: params.externalRef,
        escrow: params.escrow
          ? {
              enabled: true,
              milestones: formattedMilestones,
            }
          : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Invoice creation failed');
    }

    return await res.json();
  },
};
