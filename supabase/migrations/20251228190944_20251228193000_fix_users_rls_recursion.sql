/*
  # Fix Infinite Recursion in Users Table RLS Policies

  ## Problem
  The UPDATE policy on public.users was causing infinite recursion (42P17) because
  the WITH CHECK clause contained a subquery selecting from the same table being
  protected by the policy, creating a circular dependency.

  ## Changes
  1. Drop all existing RLS policies on public.users
  2. Create simple, non-recursive policies that only use auth.uid()
  3. Remove any subqueries that reference the users table

  ## Security Model
  - Users can SELECT their own profile row (auth_id = auth.uid())
  - Users can UPDATE their own profile fields (auth_id = auth.uid())
  - No direct INSERT allowed (handled by trigger/RPC only)
  - No DELETE allowed (handle via admin RPC if needed)

  ## Notes
  - The previous WITH CHECK had: id = (SELECT id FROM users WHERE auth_id = auth.uid())
  - This caused recursion because the policy evaluation tried to query the same table
  - Fixed by removing the subquery entirely - auth_id check is sufficient
*/

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own name" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "System can insert profiles" ON public.users;

-- Create simple SELECT policy - users can only read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- Create simple UPDATE policy - users can only update their own profile
-- No subquery, just direct auth_id comparison to avoid recursion
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- No INSERT policy
-- Inserts are only allowed via SECURITY DEFINER trigger or RPC functions
-- This prevents users from creating duplicate profiles

-- No DELETE policy
-- Profile deletion should be handled via admin functions if needed
