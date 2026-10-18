import * as React from 'react';

export interface RobinPayButtonProps {
  /** Merchant wallet address or public identifier */
  publicKey?: string;
  merchant?: string;
  /** Payment amount in token units (e.g. "49.00") */
  amount: string;
  /** Payment token: 'USDC' | 'ETH' */
  token?: 'USDC' | 'ETH';
  /** Optional invoice description */
  description?: string;
  /** Optional merchant internal order reference */
  externalRef?: string;
  /** Gateway URL (defaults to https://gateway.robinpay.com or window.location.origin) */
  gatewayUrl?: string;
  /** Optional custom button styles */
  className?: string;
  /** Callback fired on successful on-chain transaction */
  onSuccess?: (result: { orderId: string; hash?: string; txHash?: string }) => void;
  /** Callback fired if payment encounters an error */
  onError?: (error: string) => void;
  /** Custom button content */
  children?: React.ReactNode;
}

export function RobinPayButton({
  publicKey,
  merchant,
  amount,
  token = 'USDC',
  description,
  externalRef,
  gatewayUrl,
  className,
  onSuccess,
  onError,
  children,
}: RobinPayButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const merchantAddress = merchant || publicKey;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const baseUrl =
        gatewayUrl ||
        (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:3000');

      // 1. Create a stateless signed invoice token
      const res = await fetch(`${baseUrl}/api/v1/invoices/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: merchantAddress || '0x0000000000000000000000000000000000000000',
          amount,
          token,
          description: description || 'Payment via RobinPay',
          externalRef,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to initiate RobinPay checkout');
      }

      const invoiceData = await res.json();

      // 2. Open payment modal / new window or navigate to pay page
      if (typeof window !== 'undefined') {
        const payUrl = invoiceData.url || `${baseUrl}/pay/${invoiceData.token}`;

        // Listen for postMessage from payment window
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'ROBINPAY_PAYMENT_SUCCESS') {
            window.removeEventListener('message', messageHandler);
            onSuccess?.({
              orderId: event.data.orderId || invoiceData.orderId,
              hash: event.data.txHash,
              txHash: event.data.txHash,
            });
          }
        };
        window.addEventListener('message', messageHandler);

        // Open checkout popup or redirect
        const width = 480;
        const height = 680;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          payUrl,
          'RobinPayCheckout',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`,
        );

        if (!popup || popup.closed) {
          // If popup is blocked by browser, redirect directly
          window.location.href = payUrl;
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading}
      className={
        className ||
        'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A0A0A] text-white font-mono text-sm font-semibold rounded-md border-2 border-[#0A0A0A] hover:bg-black transition-colors cursor-pointer disabled:opacity-50'
      }
    >
      {loading ? (
        <span>Opening RobinPay…</span>
      ) : children ? (
        children
      ) : (
        <span>Pay {amount} {token}</span>
      )}
    </button>
  );
}
