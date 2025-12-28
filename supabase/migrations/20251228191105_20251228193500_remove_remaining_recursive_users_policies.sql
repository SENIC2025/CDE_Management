/*
  # Remove Remaining Recursive Users Policies

  ## Problem
  After the previous fix, there are still two problematic policies on the users table:
  1. Duplicate "Users can update their own profile" policy (older one)
  2. "Users can view users in their organisation" - has recursive subquery selecting from users

  ## Changes
  - Drop the duplicate update policy
  - Drop the recursive SELECT policy for viewing org users
  - Only the two simple, non-recursive policies should remain

  ## Result
  Only these two policies should exist:
  - "Users can read own profile" (SELECT with auth_id = auth.uid())
  - "Users can update own profile" (UPDATE with auth_id = auth.uid())
*/

-- Drop the duplicate update policy (older one with slightly different name)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Drop the recursive organisation-based SELECT policy
-- This policy had: org_id IN (SELECT users.org_id FROM users WHERE auth_id = auth.uid())
-- which causes infinite recursion
DROP POLICY IF EXISTS "Users can view users in their organisation" ON public.users;

-- Verify: only two policies should remain on public.users:
-- 1. "Users can read own profile" (SELECT)
-- 2. "Users can update own profile" (UPDATE)
