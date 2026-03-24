// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout Session for subscription purchases.
//
// Request body: { orgId: string, priceId: string }
// Returns: { url: string } — the Stripe Checkout URL to redirect the user to.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { stripe } from '../_shared/stripe.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // ── 1. Verify JWT and extract user ────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create a client with the user's JWT to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Parse request ──────────────────────────────────────────────
    const { orgId, priceId } = await req.json();

    if (!orgId || !priceId) {
      return new Response(
        JSON.stringify({ error: 'Missing orgId or priceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Verify user is org admin ───────────────────────────────────
    const { data: isAdmin } = await supabaseAdmin.rpc('is_org_admin', {
      p_org_id: orgId,
    });

    // Also check directly since the RPC runs as the service role
    const { data: memberData } = await supabaseAdmin
      .from('organisation_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (memberData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only organisation admins can manage billing' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 4. Get or create Stripe Customer ──────────────────────────────
    // Check if org already has a Stripe customer ID
    const { data: planData } = await supabaseAdmin
      .from('organisation_plans')
      .select('stripe_customer_id, plan_tier')
      .eq('org_id', orgId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let customerId = planData?.stripe_customer_id;

    if (!customerId) {
      // Get org name for the Stripe customer
      const { data: orgData } = await supabaseAdmin
        .from('organisations')
        .select('name')
        .eq('id', orgId)
        .single();

      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: orgData?.name || undefined,
        metadata: {
          org_id: orgId,
          user_id: user.id,
          app: 'cde-manager',
        },
      });

      customerId = customer.id;

      // Store the customer ID on the org plan
      await supabaseAdmin.rpc('link_stripe_customer', {
        p_org_id: orgId,
        p_stripe_customer_id: customerId,
      });
    }

    // ── 5. Determine trial eligibility ────────────────────────────────
    // Only the Project tier gets a 30-day free trial, and only if they haven't
    // had one before (check if stripe_subscription_id was ever set)
    const isProjectTier = priceId.includes('project') ||
      (Deno.env.get('STRIPE_PRICE_PROJECT_MONTHLY') === priceId) ||
      (Deno.env.get('STRIPE_PRICE_PROJECT_ANNUAL') === priceId);

    const hasHadSubscription = !!planData?.stripe_customer_id;
    const trialDays = (isProjectTier && !hasHadSubscription) ? 30 : undefined;

    // ── 6. Create Stripe Checkout Session ─────────────────────────────
    const appUrl = Deno.env.get('APP_URL') || 'https://663cc870-preview.caelis.family';

    const sessionParams: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/governance?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/plans?checkout=cancelled`,
      subscription_data: {
        metadata: {
          org_id: orgId,
          app: 'cde-manager',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
    };

    // Add trial period if eligible
    if (trialDays) {
      sessionParams.subscription_data.trial_period_days = trialDays;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[create-checkout-session] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
