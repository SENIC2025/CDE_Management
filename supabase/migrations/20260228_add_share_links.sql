-- ============================================================
-- Share Links — Level 2 Public Sharing for CDE Manager
-- Allows users to create token-based public URLs for read-only
-- access to specific entities (objectives, stakeholders, etc.)
-- ============================================================

-- Share links table
CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,        -- 'objective', 'stakeholder', 'message', etc.
  entity_id UUID NOT NULL,          -- The ID of the shared entity
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,         -- auth.uid() of the creator
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,           -- NULL = never expires
  revoked_at TIMESTAMPTZ,           -- Set when link is revoked
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  label TEXT                         -- Optional human-readable label
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_entity ON public.share_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_share_links_project ON public.share_links(project_id);

-- RPC to increment view count atomically
CREATE OR REPLACE FUNCTION public.increment_share_view_count(share_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.share_links
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE token = share_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create share links for their projects
CREATE POLICY "Users can create share links for their projects"
  ON public.share_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_memberships pm
      WHERE pm.project_id = share_links.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Authenticated users can view share links for their projects
CREATE POLICY "Users can view share links for their projects"
  ON public.share_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_memberships pm
      WHERE pm.project_id = share_links.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Authenticated users can update (revoke) share links they created
CREATE POLICY "Users can revoke share links they created"
  ON public.share_links
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Public (anon) users can read share links by token (for resolving)
CREATE POLICY "Anyone can resolve a share link by token"
  ON public.share_links
  FOR SELECT
  TO anon
  USING (true);

-- Allow the increment_share_view_count RPC to work for anon users
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, UPDATE ON public.share_links TO anon;
GRANT EXECUTE ON FUNCTION public.increment_share_view_count(TEXT) TO anon;
