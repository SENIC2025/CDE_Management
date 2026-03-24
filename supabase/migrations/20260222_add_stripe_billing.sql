-- ============================================================================
-- Stripe Billing Integration
-- Adds billing columns to organisation_plans and helper RPCs for webhook sync
-- ============================================================================

-- ── 1. Add Stripe billing columns to organisation_plans ─────────────────────
-- These are safe ALTER TABLE ADD COLUMN IF NOT EXISTS statements

ALTER TABLE organisation_plans
  ADD COLUMN IF NOT EXISTS stripe_customer_id    text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id       text,
  ADD COLUMN IF NOT EXISTS billing_interval      text CHECK (billing_interval IN ('monthly', 'annual')),
  ADD COLUMN IF NOT EXISTS current_period_end    timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end  boolean DEFAULT false;

-- Index for webhook lookups (Stripe fires events with customer_id or subscription_id)
CREATE INDEX IF NOT EXISTS idx_org_plans_stripe_customer
  ON organisation_plans (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_plans_stripe_subscription
  ON organisation_plans (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ── 2. sync_stripe_subscription RPC ─────────────────────────────────────────
-- Called by the Stripe webhook Edge Function to update plan data.
-- SECURITY DEFINER + restricted to service_role means only the webhook can call this.

CREATE OR REPLACE FUNCTION sync_stripe_subscription(
  p_stripe_customer_id    text,
  p_stripe_subscription_id text,
  p_stripe_price_id       text,
  p_plan_tier             text,
  p_status                text,
  p_billing_interval      text,
  p_current_period_end    timestamptz,
  p_cancel_at_period_end  boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_plan_id uuid;
  v_result jsonb;
BEGIN
  -- Find the org by stripe_customer_id
  SELECT org_id, id INTO v_org_id, v_plan_id
  FROM organisation_plans
  WHERE stripe_customer_id = p_stripe_customer_id
    AND status IN ('active', 'trial')
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no match by customer_id, try subscription_id
  IF v_org_id IS NULL THEN
    SELECT org_id, id INTO v_org_id, v_plan_id
    FROM organisation_plans
    WHERE stripe_subscription_id = p_stripe_subscription_id
      AND status IN ('active', 'trial')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No matching organisation found for Stripe customer');
  END IF;

  -- Map Stripe status to app status
  -- Stripe: active, trialing, past_due, canceled, unpaid, incomplete
  -- App: active, trial, suspended
  DECLARE
    v_app_status text;
  BEGIN
    CASE p_status
      WHEN 'active'   THEN v_app_status := 'active';
      WHEN 'trialing' THEN v_app_status := 'trial';
      WHEN 'past_due' THEN v_app_status := 'active'; -- grace period
      WHEN 'canceled' THEN v_app_status := 'suspended';
      WHEN 'unpaid'   THEN v_app_status := 'suspended';
      ELSE v_app_status := 'active';
    END CASE;

    -- Update the plan
    UPDATE organisation_plans
    SET
      plan_tier               = p_plan_tier,
      status                  = v_app_status,
      stripe_subscription_id  = p_stripe_subscription_id,
      stripe_price_id         = p_stripe_price_id,
      billing_interval        = p_billing_interval,
      current_period_end      = p_current_period_end,
      cancel_at_period_end    = p_cancel_at_period_end,
      updated_at              = now()
    WHERE id = v_plan_id;

    v_result := jsonb_build_object(
      'success', true,
      'org_id', v_org_id,
      'plan_id', v_plan_id,
      'status', v_app_status,
      'tier', p_plan_tier
    );
  END;

  RETURN v_result;
END;
$$;

-- ── 3. get_billing_info RPC ─────────────────────────────────────────────────
-- Frontend reads this to display billing status on the Governance page.
-- Returns billing fields for the active plan.

CREATE OR REPLACE FUNCTION get_billing_info(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'stripe_customer_id',    op.stripe_customer_id,
    'stripe_subscription_id', op.stripe_subscription_id,
    'stripe_price_id',       op.stripe_price_id,
    'billing_interval',      op.billing_interval,
    'current_period_end',    op.current_period_end,
    'cancel_at_period_end',  op.cancel_at_period_end,
    'plan_tier',             op.plan_tier,
    'status',                op.status
  )
  INTO v_result
  FROM organisation_plans op
  WHERE op.org_id = p_org_id
    AND op.status IN ('active', 'trial')
  ORDER BY op.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- ── 4. link_stripe_customer RPC ─────────────────────────────────────────────
-- Called by create-checkout-session Edge Function to store the Stripe customer ID
-- on the organisation's plan BEFORE redirecting to checkout.

CREATE OR REPLACE FUNCTION link_stripe_customer(
  p_org_id             uuid,
  p_stripe_customer_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organisation_plans
  SET
    stripe_customer_id = p_stripe_customer_id,
    updated_at         = now()
  WHERE org_id = p_org_id
    AND status IN ('active', 'trial')
    AND (stripe_customer_id IS NULL OR stripe_customer_id = p_stripe_customer_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 5. Grant execute permissions ────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION sync_stripe_subscription TO service_role;
GRANT EXECUTE ON FUNCTION get_billing_info TO authenticated;
GRANT EXECUTE ON FUNCTION link_stripe_customer TO service_role;
