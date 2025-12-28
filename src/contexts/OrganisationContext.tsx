import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Organisation {
  id: string;
  name: string;
  created_at: string;
}

interface OrganisationMember {
  org_id: string;
  role: string;
  organisation: Organisation;
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
  const { user, profile } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organisation | null>(null);
  const [currentOrgRole, setCurrentOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [firstProjectId, setFirstProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      loadOrganisations();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  async function loadOrganisations() {
    try {
      if (!profile?.id) {
        console.log('[OrganisationContext] No profile ID, skipping org load');
        setLoading(false);
        return;
      }

      console.log('[OrganisationContext] Loading organisations for user:', profile.id);
      const { data: memberships, error } = await supabase
        .from('organisation_members')
        .select(`
          org_id,
          role,
          organisations:org_id (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', profile.id);

      if (error) throw error;

      const orgs = memberships
        ?.map((m: any) => m.organisations)
        .filter(Boolean) as Organisation[];

      console.log('[OrganisationContext] Found', orgs?.length || 0, 'organisations');
      setOrganisations(orgs || []);

      if (orgs && orgs.length > 0) {
        const savedOrgId = localStorage.getItem('currentOrgId');
        const savedOrg = orgs.find(o => o.id === savedOrgId);

        if (savedOrg) {
          console.log('[OrganisationContext] Setting saved org:', savedOrg.name);
          setCurrentOrgInternal(savedOrg, memberships);
        } else {
          console.log('[OrganisationContext] Setting first org:', orgs[0].name);
          localStorage.removeItem('currentOrgId');
          setCurrentOrgInternal(orgs[0], memberships);
        }
      } else {
        console.log('[OrganisationContext] No orgs found, triggering bootstrap');
        await bootstrapOrganisation();
      }
    } catch (error) {
      console.error('[OrganisationContext] Error loading organisations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function bootstrapOrganisation() {
    try {
      console.log('[OrganisationContext] Starting workspace provisioning...');
      setProvisioning(true);
      setProvisioningError(null);

      const { data: projectId, error } = await supabase
        .rpc('provision_first_workspace');

      if (error) {
        const errorMessage = error.message || 'Failed to create workspace';
        setProvisioningError(errorMessage);
        console.error('[OrganisationContext] Provisioning RPC error:', error);
        setLoading(false);
        return;
      }

      console.log('[OrganisationContext] Provisioning succeeded, project ID:', projectId);
      if (projectId) {
        setFirstProjectId(projectId);
      }

      console.log('[OrganisationContext] Loading organisations after provisioning...');
      await loadOrganisations();
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred while creating your workspace';
      setProvisioningError(errorMessage);
      console.error('[OrganisationContext] Provisioning exception:', error);
      setLoading(false);
    } finally {
      setProvisioning(false);
      console.log('[OrganisationContext] Provisioning finished');
    }
  }

  async function retryProvisioning() {
    console.log('[OrganisationContext] Retry provisioning requested');
    setProvisioningError(null);
    setLoading(true);
    await bootstrapOrganisation();
  }

  function clearFirstProject() {
    setFirstProjectId(null);
  }

  function setCurrentOrgInternal(org: Organisation, memberships: any[]) {
    setCurrentOrgState(org);
    localStorage.setItem('currentOrgId', org.id);

    const membership = memberships?.find((m: any) => m.org_id === org.id);
    setCurrentOrgRole(membership?.role || 'viewer');
  }

  function setCurrentOrg(orgId: string) {
    console.log('[Org] setCurrentOrg called with orgId:', orgId);
    const org = organisations.find(o => o.id === orgId);
    if (org) {
      console.log('[Org] Setting current org:', org.name, 'id:', org.id);
      setCurrentOrgState(org);
      localStorage.setItem('currentOrgId', orgId);

      supabase
        .from('organisation_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', profile!.id)
        .maybeSingle()
        .then(({ data }) => {
          const role = data?.role || 'viewer';
          console.log('[Org] User role in org:', role);
          setCurrentOrgRole(role);
        });
    } else {
      console.warn('[Org] Organisation not found in list yet, fetching from database...');
      localStorage.setItem('currentOrgId', orgId);

      supabase
        .from('organisations')
        .select('id, name, created_at')
        .eq('id', orgId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('[Org] Error fetching org:', error);
            return;
          }
          if (data) {
            console.log('[Org] Fetched org from database:', data.name);
            setCurrentOrgState(data as Organisation);

            return supabase
              .from('organisation_members')
              .select('role')
              .eq('org_id', orgId)
              .eq('user_id', profile!.id)
              .maybeSingle();
          }
        })
        .then((result) => {
          if (result && result.data) {
            const role = result.data.role || 'viewer';
            console.log('[Org] User role in org:', role);
            setCurrentOrgRole(role);
          }
        })
        .catch((error) => {
          console.error('[Org] Error in setCurrentOrg fallback:', error);
        });
    }
  }

  async function refreshOrganisations() {
    console.log('[Org] refreshOrganisations called');
    await loadOrganisations();
    console.log('[Org] refreshOrganisations complete, org count:', organisations.length);
  }

  async function updateOrganisationName(orgId: string, newName: string) {
    if (!profile) throw new Error('Not authenticated');

    const oldName = organisations.find(o => o.id === orgId)?.name;

    const { error } = await supabase
      .from('organisations')
      .update({ name: newName })
      .eq('id', orgId);

    if (error) throw error;

    await supabase
      .from('audit_events')
      .insert({
        org_id: orgId,
        project_id: null,
        user_id: profile.id,
        entity_type: 'organisation',
        entity_id: orgId,
        action: 'updated',
        metadata: {
          field: 'name',
          old_value: oldName,
          new_value: newName
        }
      });

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
