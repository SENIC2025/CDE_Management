// Stripe client and price-to-tier mapping for Edge Functions

import Stripe from 'https://esm.sh/stripe@14?target=deno';

// Initialize Stripe with the secret key from environment
export const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// ── Price ID → Tier mapping ─────────────────────────────────────────────────
// Environment variables hold the Stripe Price IDs created in the Dashboard.
// Format: STRIPE_PRICE_{TIER}_{INTERVAL}

export function getPriceTierAndInterval(priceId: string): {
  tier: string;
  interval: 'monthly' | 'annual';
} | null {
  const mappings: Record<string, { tier: string; interval: 'monthly' | 'annual' }> = {
    [Deno.env.get('STRIPE_PRICE_PROJECT_MONTHLY') || '']: { tier: 'project', interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_PROJECT_ANNUAL') || '']:  { tier: 'project', interval: 'annual' },
    [Deno.env.get('STRIPE_PRICE_PORTFOLIO_MONTHLY') || '']: { tier: 'portfolio', interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_PORTFOLIO_ANNUAL') || '']:  { tier: 'portfolio', interval: 'annual' },
    [Deno.env.get('STRIPE_PRICE_ORGANISATION_MONTHLY') || '']: { tier: 'organisation', interval: 'monthly' },
    [Deno.env.get('STRIPE_PRICE_ORGANISATION_ANNUAL') || '']:  { tier: 'organisation', interval: 'annual' },
  };

  return mappings[priceId] || null;
}

// ── Tier → Default Price ID ─────────────────────────────────────────────────

export function getDefaultPriceId(tier: string, interval: 'monthly' | 'annual'): string | null {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${interval.toUpperCase()}`;
  return Deno.env.get(key) || null;
}
