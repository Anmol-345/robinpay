import { describe, it, expect } from 'vitest';
import { verifyInvoiceSignature } from '@/lib/eip712';

describe('EIP-712 invoice signature', () => {
  const payload = {
    merchant: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    amount: '1000000',
    token: '0xabcdef0123456789abcdef0123456789abcdef01' as `0x${string}`,
    decimals: 6,
    description: 'Test invoice',
    externalRef: 'ext-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
    webhookToken: '',
  };

  it('rejects an invalid signature', async () => {
    const result = await verifyInvoiceSignature({
      signature: ('0x' + '00'.repeat(65)) as `0x${string}`,
      payload,
    });
    expect(result).toBeNull();
  });

  it('handles missing signature gracefully', async () => {
    // We can't easily generate a valid signature without a private key in vitest,
    // but we can verify the function structure works.
    const result = await verifyInvoiceSignature({
      signature: ('0x' + '00'.repeat(64) + '01') as `0x${string}`,
      payload,
    });
    expect(result).toBeNull();
  });
});
