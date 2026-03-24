import { supabase } from './supabase';

/**
 * Share Link Service — Level 2 Public Sharing
 *
 * Creates token-based public share links that allow read-only access
 * to specific items without requiring authentication.
 */

export interface ShareLink {
  id: string;
  token: string;
  entity_type: string;
  entity_id: string;
  project_id: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  last_viewed_at: string | null;
  label: string | null;
}

export interface CreateShareLinkParams {
  entityType: string;
  entityId: string;
  projectId: string;
  expiresInDays?: number | null;
  label?: string;
}

/** Generate a cryptographically random token */
function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 32);
}

/** Create a new share link for an entity */
export async function createShareLink({
  entityType,
  entityId,
  projectId,
  expiresInDays = 30,
  label,
}: CreateShareLinkParams): Promise<ShareLink> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const token = generateToken();
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      token,
      entity_type: entityType,
      entity_id: entityId,
      project_id: projectId,
      created_by: user.id,
      expires_at: expiresAt,
      label: label || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Resolve a share token to get the shared entity info (public — no auth required) */
export async function resolveShareToken(token: string): Promise<{
  entityType: string;
  entityId: string;
  projectId: string;
  expired: boolean;
  revoked: boolean;
} | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('entity_type, entity_id, project_id, expires_at, revoked_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return null;

  const expired = data.expires_at ? new Date(data.expires_at) < new Date() : false;
  const revoked = !!data.revoked_at;

  // Increment view count (fire and forget)
  if (!expired && !revoked) {
    supabase
      .from('share_links')
      .update({
        view_count: supabase.rpc ? undefined : 0, // handled by RPC below
        last_viewed_at: new Date().toISOString(),
      })
      .eq('token', token)
      .then(() => {
        // Also increment view_count via raw update
        supabase.rpc('increment_share_view_count', { share_token: token }).catch(() => {});
      });
  }

  return {
    entityType: data.entity_type,
    entityId: data.entity_id,
    projectId: data.project_id,
    expired,
    revoked,
  };
}

/** Fetch a specific entity's data for the shared view */
export async function fetchSharedEntity(entityType: string, entityId: string, projectId: string): Promise<any> {
  const tableMap: Record<string, string> = {
    objective: 'project_objectives',
    stakeholder: 'stakeholder_groups',
    message: 'messages',
    asset: 'result_assets',
    activity: 'activities',
    channel: 'channels',
    campaign: 'campaigns',
    indicator: 'indicators',
  };

  const table = tableMap[entityType];
  if (!table) return null;

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', entityId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) return null;
  return data;
}

/** List all share links for a specific entity */
export async function listShareLinks(entityType: string, entityId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

/** Revoke a share link */
export async function revokeShareLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', linkId);

  return !error;
}

/** Get the public share URL for a token */
export function getShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}

/** Entity type labels for display */
export const ENTITY_TYPE_LABELS: Record<string, string> = {
  objective: 'Objective',
  stakeholder: 'Stakeholder',
  message: 'Message',
  asset: 'Result Asset',
  activity: 'Activity',
  channel: 'Channel',
  campaign: 'Campaign',
  indicator: 'Indicator',
};
