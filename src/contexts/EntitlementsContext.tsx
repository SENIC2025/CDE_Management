import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  Entitlements,
  PlanTier,
  PlanStatus,
  OrganisationPlan,
  GovernanceSettings,
  EntitlementsService,
  getEffectiveEntitlements,
  DEFAULT_ENTITLEMENTS,
  OrganisationMember,
} from '../lib/entitlements';

interface EntitlementsContextType {
  entitlements: Entitlements | null;
  planTier: PlanTier | null;
  planStatus: PlanStatus | null;
  governance: GovernanceSettings | null;
  service: EntitlementsService | null;
  loading: boolean;
  isOrgAdmin: boolean;
  reload: () => Promise<void>;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used within EntitlementsProvider');
  }
  return context;
}

interface EntitlementsProviderProps {
  children: ReactNode;
}

export function EntitlementsProvider({ children }: EntitlementsProviderProps) {
  const { profile } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [governance, setGovernance] = useState<GovernanceSettings | null>(null);
  const [service, setService] = useState<EntitlementsService | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    if (profile?.org_id) {
      loadEntitlements();
      checkOrgAdmin();
    } else {
      setLoading(false);
    }
  }, [profile?.org_id, profile?.id]);

  async function checkOrgAdmin() {
    if (!profile?.org_id || !profile?.id) {
      setIsOrgAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organisation_members')
        .select('role')
        .eq('org_id', profile.org_id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('[Entitlements] Error checking org admin status:', error);
        setIsOrgAdmin(false);
        return;
      }

      setIsOrgAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('[Entitlements] Error checking org admin status:', error);
      setIsOrgAdmin(false);
    }
  }

  async function loadEntitlements() {
    if (!profile?.org_id) return;

    setLoading(true);
    try {
      // Load effective entitlements via secure RPC
      const { data: entitlementsData, error: entitlementsError } = await supabase
        .rpc('get_effective_entitlements', { p_org_id: profile.org_id });

      if (entitlementsError) {
        console.error('[Entitlements] Error loading entitlements via RPC:', entitlementsError);
        throw entitlementsError;
      }

      // Parse entitlements
      const effectiveEntitlements = entitlementsData as Entitlements;

      // Determine plan tier from entitlements (or default to project)
      let detectedTier: PlanTier = 'project';
      if (effectiveEntitlements.max_projects === null) {
        detectedTier = 'organisation';
      } else if (effectiveEntitlements.max_projects > 1) {
        detectedTier = 'portfolio';
      }

      setEntitlements(effectiveEntitlements);
      setPlanTier(detectedTier);
      setPlanStatus('active');

      // Create service
      const entService = new EntitlementsService(
        effectiveEntitlements,
        detectedTier,
        'active'
      );
      setService(entService);

      // Load governance settings (use maybeSingle)
      const { data: govData, error: govError } = await supabase
        .from('organisation_governance_settings')
        .select('*')
        .eq('org_id', profile.org_id)
        .maybeSingle();

      if (govError) {
        console.error('[Entitlements] Error loading governance settings:', govError);
      } else if (govData) {
        setGovernance(govData as GovernanceSettings);
      } else {
        // Create default governance settings
        await initializeDefaultGovernance();
      }
    } catch (error) {
      console.error('[Entitlements] Error loading entitlements:', error);
      // Set default values on error
      const defaultEntitlements = DEFAULT_ENTITLEMENTS.project;
      setEntitlements(defaultEntitlements);
      setPlanTier('project');
      setPlanStatus('active');
      setService(new EntitlementsService(defaultEntitlements, 'project', 'active'));
    } finally {
      setLoading(false);
    }
  }

  async function initializeDefaultGovernance() {
    if (!profile?.org_id || !profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('organisation_governance_settings')
        .insert({
          org_id: profile.org_id,
          org_defaults_json: {
            hourly_rate_default: 50,
          },
          methodology_governance_mode: 'project_only',
          template_governance_mode: 'project_only',
          branding_json: {},
          created_by: profile.id,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('[Entitlements] Error initializing default governance:', error);
        return;
      }

      if (data) {
        setGovernance(data as GovernanceSettings);
      }
    } catch (error) {
      console.error('[Entitlements] Error initializing default governance:', error);
    }
  }

  async function reload() {
    await loadEntitlements();
    await checkOrgAdmin();
  }

  return (
    <EntitlementsContext.Provider
      value={{
        entitlements,
        planTier,
        planStatus,
        governance,
        service,
        loading,
        isOrgAdmin,
        reload,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
}
