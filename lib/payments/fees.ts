// =============================================================================
// lib/payments/fees.ts — Basis-points fee math
// =============================================================================
// Fees are denominated in basis points (10000 = 100%). Hard-capped at 500 (5%)
// by default; individual merchants may have a lower override.
export const MAX_FEE_BPS = 500;
export const FEE_DENOMINATOR = 10_000;

export function computeFee(amount: bigint, feeBps: number): { fee: bigint; net: bigint } {
  const fee = (amount * BigInt(feeBps)) / BigInt(FEE_DENOMINATOR);
  const net = amount - fee;
  return { fee, net };
}

export function isValidFeeBps(bps: number): boolean {
  return bps >= 0 && bps <= MAX_FEE_BPS;
}
