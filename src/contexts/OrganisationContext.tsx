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
  setCurrentOrg: (orgId: string) => void;
  refreshOrganisations: () => Promise<void>;
  updateOrganisationName: (orgId: string, newName: string) => Promise<void>;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organisation | null>(null);
  const [currentOrgRole, setCurrentOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
        return;
      }

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

      setOrganisations(orgs || []);

      if (orgs && orgs.length > 0) {
        const savedOrgId = localStorage.getItem('currentOrgId');
        const savedOrg = orgs.find(o => o.id === savedOrgId);

        if (savedOrg) {
          setCurrentOrgInternal(savedOrg, memberships);
        } else {
          setCurrentOrgInternal(orgs[0], memberships);
        }
      } else {
        await bootstrapOrganisation();
      }
    } catch (error) {
      console.error('Error loading organisations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function bootstrapOrganisation() {
    try {
      const { data: orgId, error } = await supabase
        .rpc('bootstrap_user_organisation', {
          p_org_name: null
        });

      if (error) throw error;

      await loadOrganisations();
    } catch (error) {
      console.error('Error bootstrapping organisation:', error);
      setLoading(false);
    }
  }

  function setCurrentOrgInternal(org: Organisation, memberships: any[]) {
    setCurrentOrgState(org);
    localStorage.setItem('currentOrgId', org.id);

    const membership = memberships?.find((m: any) => m.org_id === org.id);
    setCurrentOrgRole(membership?.role || 'viewer');
  }

  function setCurrentOrg(orgId: string) {
    const org = organisations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrgState(org);
      localStorage.setItem('currentOrgId', orgId);

      supabase
        .from('organisation_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', profile!.id)
        .maybeSingle()
        .then(({ data }) => {
          setCurrentOrgRole(data?.role || 'viewer');
        });
    }
  }

  async function refreshOrganisations() {
    await loadOrganisations();
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
        setCurrentOrg,
        refreshOrganisations,
        updateOrganisationName
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
