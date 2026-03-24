// Supabase Edge Function: stripe-webhook
// Receives Stripe webhook events and syncs billing state to organisation_plans.
//
// Events handled:
//   - checkout.session.completed    → New subscription created
//   - customer.subscription.updated → Plan change, renewal, trial end
//   - customer.subscription.deleted → Cancellation
//   - invoice.payment_failed        → Payment failure (flag for follow-up)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { stripe, getPriceTierAndInterval } from '../_shared/stripe.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // ── 1. Verify webhook signature ─────────────────────────────────
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('[stripe-webhook] Missing stripe-signature header');
      return new Response('Missing signature', { status: 400 });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error('[stripe-webhook] Signature verification failed:', err.message);
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`);

    // ── 2. Handle events ────────────────────────────────────────────
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Only handle subscription checkouts
        if (session.mode !== 'subscription') {
          console.log('[stripe-webhook] Ignoring non-subscription checkout');
          break;
        }

        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        // Retrieve the full subscription to get price details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const tierInfo = priceId ? getPriceTierAndInterval(priceId) : null;

        // Sync to database
        const { data: syncResult, error: syncError } = await supabaseAdmin.rpc('sync_stripe_subscription', {
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscriptionId,
          p_stripe_price_id: priceId || '',
          p_plan_tier: tierInfo?.tier || 'project',
          p_status: subscription.status,
          p_billing_interval: tierInfo?.interval || 'monthly',
          p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          p_cancel_at_period_end: subscription.cancel_at_period_end,
        });

        if (syncError) {
          console.error('[stripe-webhook] sync_stripe_subscription error:', syncError);
        } else {
          console.log('[stripe-webhook] checkout.session.completed synced:', syncResult);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const tierInfo = priceId ? getPriceTierAndInterval(priceId) : null;

        const { data: syncResult, error: syncError } = await supabaseAdmin.rpc('sync_stripe_subscription', {
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscription.id,
          p_stripe_price_id: priceId || '',
          p_plan_tier: tierInfo?.tier || 'project',
          p_status: subscription.status,
          p_billing_interval: tierInfo?.interval || 'monthly',
          p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          p_cancel_at_period_end: subscription.cancel_at_period_end,
        });

        if (syncError) {
          console.error('[stripe-webhook] sync error on subscription.updated:', syncError);
        } else {
          console.log('[stripe-webhook] subscription.updated synced:', syncResult);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const tierInfo = priceId ? getPriceTierAndInterval(priceId) : null;

        // Mark as canceled → suspended in our system
        const { data: syncResult, error: syncError } = await supabaseAdmin.rpc('sync_stripe_subscription', {
          p_stripe_customer_id: customerId,
          p_stripe_subscription_id: subscription.id,
          p_stripe_price_id: priceId || '',
          p_plan_tier: tierInfo?.tier || 'project',
          p_status: 'canceled',
          p_billing_interval: tierInfo?.interval || 'monthly',
          p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          p_cancel_at_period_end: true,
        });

        if (syncError) {
          console.error('[stripe-webhook] sync error on subscription.deleted:', syncError);
        } else {
          console.log('[stripe-webhook] subscription.deleted synced:', syncResult);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        // Log the payment failure — the subscription status will be updated
        // via customer.subscription.updated when Stripe marks it past_due
        console.warn(`[stripe-webhook] Payment failed for customer ${customerId}, invoice ${invoice.id}`);

        // Optionally: send notification, create audit log entry, etc.
        // For now, we rely on Stripe's automatic retry logic and the
        // subscription.updated event to handle status changes.
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    // ── 3. Acknowledge receipt ──────────────────────────────────────
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[stripe-webhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
