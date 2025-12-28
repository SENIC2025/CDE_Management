/*
  # Fix Duplicate Project Membership Triggers

  1. Problem
    - Two triggers on projects table both try to insert project_memberships
    - `on_project_created` trigger uses `create_project_membership_for_creator()` WITHOUT ON CONFLICT
    - `trg_add_creator_project_membership` trigger uses `add_creator_project_membership()` WITH ON CONFLICT
    - This causes duplicate key violations when both triggers fire

  2. Solution
    - Drop the duplicate trigger `on_project_created` and its function
    - Keep only `trg_add_creator_project_membership` which has proper conflict handling
    - Ensure all membership inserts are idempotent

  3. Impact
    - Eliminates "duplicate key value violates unique constraint project_memberships_project_id_user_id_key" errors
    - Makes workspace provisioning fully reliable
    - Allows retry without errors

  4. Safety
    - Dropping redundant trigger has no functional impact
    - Remaining trigger still assigns creator membership correctly
    - All RPCs already use ON CONFLICT for safety
*/

-- Drop the duplicate trigger that causes conflicts
DROP TRIGGER IF EXISTS on_project_created ON projects;

-- Drop the function that doesn't handle conflicts properly
DROP FUNCTION IF EXISTS create_project_membership_for_creator();

-- The remaining trigger (trg_add_creator_project_membership) is sufficient
-- and has proper ON CONFLICT DO NOTHING handling

-- Verify the good trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_add_creator_project_membership'
    AND tgrelid = 'projects'::regclass
  ) THEN
    RAISE EXCEPTION 'Critical trigger trg_add_creator_project_membership is missing!';
  END IF;
END $$;
