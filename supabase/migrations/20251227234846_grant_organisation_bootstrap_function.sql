/*
  # Grant Organisation Bootstrap Function

  1. Purpose
    - Allow authenticated users to execute the bootstrap_user_organisation function
    - Ensures proper permissions for organisation creation

  2. Changes
    - Grant EXECUTE on bootstrap_user_organisation to authenticated role
*/

GRANT EXECUTE ON FUNCTION public.bootstrap_user_organisation(text) TO authenticated;
