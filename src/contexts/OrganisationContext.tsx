import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Organisation {
  id: string;
  name: string;
  created_at: string;
}

interface OrganisationContextType {
  organisations: Organisation[];
  currentOrg: Organisation | null;
  currentOrgRole: string | null;
  loading: boolean;
  provisioning: boolean;
  provisioningError: string | null;
  firstProjectId: string | null;
  setCurrentOrg: (orgId: string) => void;
  refreshOrganisations: () => Promise<void>;
  updateOrganisationName: (orgId: string, newName: string) => Promise<void>;
  clearFirstProject: () => void;
  retryProvisioning: () => Promise<void>;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organisation | null>(null);
  const [currentOrgRole, setCurrentOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [firstProjectId, setFirstProjectId] = useState<string | null>(null);

  // Load organisations when user is authenticated
  // Works with OR without a profile row — the RPC handles both cases
  useEffect(() => {
    if (user) {
      loadOrganisations();
    } else {
      setOrganisations([]);
      setCurrentOrgState(null);
      setCurrentOrgRole(null);
      setLoading(false);
    }
  }, [user, profile]);

  async function loadOrganisations() {
    try {
      console.log('[OrgContext] Loading organisations...');
      console.log('[OrgContext] user:', user?.id, 'profile:', profile?.id || 'null', 'org_id:', profile?.org_id || 'null');

      // Use list_my_organisations RPC (SECURITY DEFINER — bypasses all RLS)
      // This is the ONLY reliable way to load orgs because the organisations
      // table has RLS enabled without SELECT policies in the base schema.
      const { data: rpcOrgs, error: rpcError } = await supabase.rpc('list_my_organisations');

      if (rpcError) {
        console.error('[OrgContext] list_my_organisations RPC failed:', rpcError.message, rpcError.code, rpcError.details);
        // Don't throw — just set empty state. User can click "Setup" button.
        setOrganisations([]);
        setLoading(false);
        return;
      }

      const orgs: Organisation[] = (rpcOrgs || []).map((o: any) => ({
        id: o.org_id,
        name: o.org_name,
        created_at: o.member_since,
      }));

      console.log('[OrgContext] Found', orgs.length, 'organisations');
      setOrganisations(orgs);

      if (orgs.length > 0) {
        // Pick the saved org or the first one
        const savedOrgId = localStorage.getItem('currentOrgId');
        const savedOrg = orgs.find((o) => o.id === savedOrgId);
        const targetOrg = savedOrg || orgs[0];

        console.log('[OrgContext] Setting current org:', targetOrg.name);
        setCurrentOrgState(targetOrg);
        localStorage.setItem('currentOrgId', targetOrg.id);

        const rpcMember = rpcOrgs?.find((o: any) => o.org_id === targetOrg.id);
        setCurrentOrgRole(rpcMember?.my_role || 'viewer');
      }
      // If orgs.length === 0, we do NOTHING here.
      // RequireOrg will show WorkspaceRecovery.
      // The user must explicitly click "Setup Workspace Automatically".
      // NO auto-bootstrap. NO loop.

    } catch (error: any) {
      console.error('[OrgContext] Exception loading orgs:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }

  // Called ONLY when the user clicks "Setup Workspace Automatically"
  async function retryProvisioning() {
    console.log('[OrgContext] User clicked Setup Workspace — starting provisioning');
    setProvisioningError(null);
    setProvisioning(true);

    try {
      // Step 1: Call provision_first_workspace RPC (SECURITY DEFINER)
      // This creates user profile (if missing), org, org_members, and first project
      console.log('[OrgContext] Calling provision_first_workspace...');
      const { data: projectId, error } = await supabase.rpc('provision_first_workspace');

      if (error) {
        console.error('[OrgContext] provision_first_workspace failed:', error.message, error.code, error.details);
        setProvisioningError(error.message || 'Failed to create workspace. Please try again.');
        setProvisioning(false);
        return;
      }

      console.log('[OrgContext] Provisioning succeeded! Project ID:', projectId);
      setFirstProjectId(projectId);

      // Step 2: Refresh the auth profile (now has org_id set)
      console.log('[OrgContext] Refreshing auth profile...');
      await refreshProfile();

      // Step 3: Load organisations directly via RPC (no page reload!)
      console.log('[OrgContext] Loading organisations after provisioning...');
      const { data: rpcOrgs, error: rpcError } = await supabase.rpc('list_my_organisations');

      if (rpcError) {
        console.error('[OrgContext] list_my_organisations failed after provisioning:', rpcError.message);
        // Still succeeded at provisioning — try a page reload as last resort
        console.log('[OrgContext] Falling back to page reload...');
        window.location.reload();
        return;
      }

      const orgs: Organisation[] = (rpcOrgs || []).map((o: any) => ({
        id: o.org_id,
        name: o.org_name,
        created_at: o.member_since,
      }));

      console.log('[OrgContext] After provisioning, found', orgs.length, 'organisations');

      if (orgs.length > 0) {
        setOrganisations(orgs);
        const targetOrg = orgs[0];
        setCurrentOrgState(targetOrg);
        localStorage.setItem('currentOrgId', targetOrg.id);

        const rpcMember = rpcOrgs?.find((o: any) => o.org_id === targetOrg.id);
        setCurrentOrgRole(rpcMember?.my_role || 'viewer');

        console.log('[OrgContext] Setup complete! Org:', targetOrg.name);
      } else {
        // This shouldn't happen — we just created an org
        console.error('[OrgContext] Provisioning succeeded but no orgs returned!');
        setProvisioningError('Workspace was created but could not be loaded. Please refresh the page.');
      }

    } catch (error: any) {
      console.error('[OrgContext] Provisioning exception:', error?.message || error);
      setProvisioningError(error?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setProvisioning(false);
    }
  }

  function clearFirstProject() {
    setFirstProjectId(null);
  }

  function setCurrentOrg(orgId: string) {
    console.log('[OrgContext] setCurrentOrg:', orgId);
    const org = organisations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrgState(org);
      localStorage.setItem('currentOrgId', orgId);

      // Get role from cached orgs list via RPC
      supabase.rpc('list_my_organisations')
        .then(({ data }) => {
          const match = data?.find((o: any) => o.org_id === orgId);
          setCurrentOrgRole(match?.my_role || 'viewer');
        });
    } else {
      // Org not in list yet — refresh from RPC
      localStorage.setItem('currentOrgId', orgId);
      supabase.rpc('list_my_organisations')
        .then(({ data, error }) => {
          if (error) return;
          const match = data?.find((o: any) => o.org_id === orgId);
          if (match) {
            setCurrentOrgState({
              id: match.org_id,
              name: match.org_name,
              created_at: match.member_since,
            });
            setCurrentOrgRole(match.my_role || 'viewer');
          }
        });
    }
  }

  async function refreshOrganisations() {
    await loadOrganisations();
  }

  async function updateOrganisationName(orgId: string, newName: string) {
    console.log('[OrgContext] updateOrganisationName called:', { orgId, newName, hasProfile: !!profile });

    // Try RPC first (SECURITY DEFINER — bypasses RLS, no auth.uid() needed)
    const { error: rpcError } = await supabase.rpc('update_organisation_name', {
      p_org_id: orgId,
      p_name: newName
    });

    console.log('[OrgContext] RPC result:', rpcError ? rpcError.message : 'success');

    if (rpcError) {
      // If RPC doesn't exist yet, tell user to run SQL
      if (rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
        throw new Error('Please run the SQL fix: go to ' + window.location.origin + '/fix_all.sql, copy the contents, and run in Supabase SQL Editor');
      }

      // Fallback to direct update (may work if RLS policies allow it)
      console.warn('[OrgContext] RPC failed, trying direct update:', rpcError.message);
      const { error: directError } = await supabase
        .from('organisations')
        .update({ name: newName })
        .eq('id', orgId);

      if (directError) {
        console.error('[OrgContext] Direct update also failed:', directError.message);
        throw new Error(rpcError.message);
      }
    }

    // Best-effort audit trail
    try {
      await supabase.from('audit_events').insert({
        org_id: orgId,
        project_id: null,
        user_id: profile?.id || null,
        entity_type: 'organisation',
        entity_id: orgId,
        action: 'updated',
        diff_json: { old_value: organisations.find(o => o.id === orgId)?.name, new_value: newName },
        timestamp: new Date().toISOString()
      });
    } catch {
      // Non-critical
    }

    await refreshOrganisations();
  }

  return (
    <OrganisationContext.Provider
      value={{
        organisations,
        currentOrg,
        currentOrgRole,
        loading,
        provisioning,
        provisioningError,
        firstProjectId,
        setCurrentOrg,
        refreshOrganisations,
        updateOrganisationName,
        clearFirstProject,
        retryProvisioning
      }}
    >
      {children}
    </OrganisationContext.Provider>
  );
}

export function useOrganisation() {
  const context = useContext(OrganisationContext);
  if (context === undefined) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
}
