// =============================================================================
// lib/payments/event-store.ts — Persistent event store for merchant payments
// =============================================================================
import fs from 'fs';
import path from 'path';

export interface StoredPaymentEvent {
  type: string;
  blockNumber: string;
  txHash: string;
  merchant: string;
  args: {
    orderId?: string;
    payer?: string;
    merchant?: string;
    amount?: string;
    token?: string;
    gross?: string;
    externalRef?: string;
    description?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

const EVENTS_FILE = path.join(process.cwd(), '.robinpay_events.json');

declare global {
  // eslint-disable-next-line no-var
  var __robinpay_events__: StoredPaymentEvent[] | undefined;
}

const defaultEvents: StoredPaymentEvent[] = [
  {
    type: 'PaymentProcessed',
    blockNumber: '138212940',
    txHash: '0x6406fc67749c72b6e261d931c071f742409acb3707c7dd7880701d5c69a04e08',
    merchant: '0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead',
    args: {
      orderId: 'ORD-2026-MXS9RM',
      payer: '0x49F4AED7512120fC0690bCb4786810Ffe28c3236',
      merchant: '0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead',
      amount: '0.0001 ETH',
      gross: '100000000000000',
      token: '0x0000000000000000000000000000000000000000',
      externalRef: 'ORD-2026-MXS9RM',
      description: 'Testing payment',
      timestamp: new Date().toISOString(),
    },
  },
  {
    type: 'PaymentProcessed',
    blockNumber: '138214102',
    txHash: '0x9d5c8e31a04e120fC0690bCb4786810Ffe28c323607c7dd7880701d5c69a04ea',
    merchant: '0x71c836643f37711fa49b560ab993466170ce6439',
    args: {
      orderId: 'ORD-2026-DEMO01',
      payer: '0x49F4AED7512120fC0690bCb4786810Ffe28c3236',
      merchant: '0x71c836643f37711fa49b560ab993466170ce6439',
      amount: '0.0001 ETH',
      gross: '100000000000000',
      token: '0x0000000000000000000000000000000000000000',
      externalRef: 'ORD-2026-DEMO01',
      description: 'Testnet Coffee payment',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
  },
  {
    type: 'PaymentProcessed',
    blockNumber: '138210450',
    txHash: '0x742d2e708f712919787c734035d90cc51bcff69c14415ab2260dd8d109549922',
    merchant: '0x71c836643f37711fa49b560ab993466170ce6439',
    args: {
      orderId: 'ORD-2026-DEMO02',
      payer: '0x2ae25f1c0e6431bc7d93c26be79762e7e02c8ead',
      merchant: '0x71c836643f37711fa49b560ab993466170ce6439',
      amount: '49.00 USDC',
      gross: '49000000',
      token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      externalRef: 'ORD-2026-DEMO02',
      description: 'API Pro Tier Subscription',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  },
];

function loadEvents(): StoredPaymentEvent[] {
  let list = globalThis.__robinpay_events__;
  if (!list) {
    let fileEvents: StoredPaymentEvent[] = [];
    try {
      if (fs.existsSync(EVENTS_FILE)) {
        const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
        fileEvents = JSON.parse(content);
      }
    } catch (err) {
      console.warn('[event-store] Failed to read from file:', err);
    }
    list = [...fileEvents];
    globalThis.__robinpay_events__ = list;
  }

  for (const def of defaultEvents) {
    if (!list.some((e) => e.txHash.toLowerCase() === def.txHash.toLowerCase() || (e.args.orderId && e.args.orderId === def.args.orderId))) {
      list.push(def);
    }
  }

  return list;
}

function saveEvents(events: StoredPaymentEvent[]) {
  globalThis.__robinpay_events__ = events;
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err) {
    // Read-only filesystem fallback
    console.warn('[event-store] File persistence skipped (read-only environment):', err);
  }
}

export function recordVerifiedPayment(event: StoredPaymentEvent) {
  const events = loadEvents();
  const existingIdx = events.findIndex(
    (e) => e.txHash.toLowerCase() === event.txHash.toLowerCase(),
  );

  if (existingIdx >= 0) {
    events[existingIdx] = event;
  } else {
    events.unshift(event);
  }

  saveEvents(events);
}

export function getEventsForMerchant(merchant: string): StoredPaymentEvent[] {
  const events = loadEvents();
  const m = merchant.toLowerCase();
  return events.filter(
    (e) => e.merchant.toLowerCase() === m || (e.args.merchant && String(e.args.merchant).toLowerCase() === m),
  );
}
