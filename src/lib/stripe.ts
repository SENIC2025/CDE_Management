// ── Stripe Frontend Helper ──────────────────────────────────────────────────
// Calls Supabase Edge Functions for Stripe operations.
// Stripe secret key stays server-side. Only the publishable key is used here.

import { supabase } from './supabase';

// ── Price ID Constants ──────────────────────────────────────────────────────
// These map to Stripe Price IDs configured in the environment.
// Set via VITE_STRIPE_PRICE_* env vars. Empty until Stefan configures them.

export const STRIPE_PRICES = {
  project: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PROJECT_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_PROJECT_ANNUAL || '',
  },
  portfolio: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PORTFOLIO_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_PORTFOLIO_ANNUAL || '',
  },
  organisation: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_ORGANISATION_MONTHLY || '',
    annual: import.meta.env.VITE_STRIPE_PRICE_ORGANISATION_ANNUAL || '',
  },
} as const;

export type BillingInterval = 'monthly' | 'annual';

// ── Check if Stripe is configured ───────────────────────────────────────────
export function isStripeConfigured(): boolean {
  // Check if at least one price ID is set
  return Object.values(STRIPE_PRICES).some(
    (tier) => tier.monthly !== '' || tier.annual !== ''
  );
}

// ── Get price ID for a tier and interval ────────────────────────────────────
export function getPriceId(tier: string, interval: BillingInterval): string | null {
  const tierPrices = STRIPE_PRICES[tier as keyof typeof STRIPE_PRICES];
  if (!tierPrices) return null;
  const priceId = tierPrices[interval];
  return priceId || null;
}

// ── Billing Info type ───────────────────────────────────────────────────────
export interface BillingInfo {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_interval: BillingInterval | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_tier: string | null;
  status: string | null;
}

// ── Create Checkout Session ─────────────────────────────────────────────────
// Redirects the user to Stripe's hosted checkout page.

export async function createCheckoutSession(
  orgId: string,
  priceId: string
): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to subscribe');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ orgId, priceId }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Create Portal Session ───────────────────────────────────────────────────
// Opens Stripe's self-service billing portal (manage payment methods, invoices, cancel).

export async function createPortalSession(
  orgId: string
): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to manage billing');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ orgId }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Get Billing Info ────────────────────────────────────────────────────────
// Reads billing display data from the database via RPC.

export async function getBillingInfo(orgId: string): Promise<BillingInfo | null> {
  const { data, error } = await supabase.rpc('get_billing_info', {
    p_org_id: orgId,
  });

  if (error) {
    console.error('[stripe] Error fetching billing info:', error);
    return null;
  }

  // RPC returns empty object if no billing data
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  return data as BillingInfo;
}

// ── Format helpers ──────────────────────────────────────────────────────────

export function formatBillingInterval(interval: BillingInterval | null): string {
  if (interval === 'annual') return 'Annual';
  if (interval === 'monthly') return 'Monthly';
  return 'Unknown';
}

export function formatRenewalDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

export function isBillingActive(billingInfo: BillingInfo | null): boolean {
  return billingInfo !== null && !!billingInfo.stripe_subscription_id;
}
