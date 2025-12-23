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
      const { data } = await supabase
        .from('organisation_members')
        .select('role')
        .eq('org_id', profile.org_id)
        .eq('user_id', profile.id)
        .single();

      setIsOrgAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking org admin status:', error);
      setIsOrgAdmin(false);
    }
  }

  async function loadEntitlements() {
    if (!profile?.org_id) return;

    setLoading(true);
    try {
      // Load organisation plan
      const { data: planData, error: planError } = await supabase
        .from('organisation_plans')
        .select('*')
        .eq('org_id', profile.org_id)
        .single();

      if (planError && planError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw planError;
      }

      // If no plan exists, create default project plan
      if (!planData) {
        await initializeDefaultPlan();
        await loadEntitlements(); // Reload
        return;
      }

      const plan = planData as OrganisationPlan;
      const effectiveEntitlements = getEffectiveEntitlements(
        plan.plan_tier,
        plan.entitlements_json || {}
      );

      setEntitlements(effectiveEntitlements);
      setPlanTier(plan.plan_tier);
      setPlanStatus(plan.status);

      // Create service
      const entService = new EntitlementsService(
        effectiveEntitlements,
        plan.plan_tier,
        plan.status
      );
      setService(entService);

      // Load governance settings
      const { data: govData } = await supabase
        .from('organisation_governance_settings')
        .select('*')
        .eq('org_id', profile.org_id)
        .single();

      if (govData) {
        setGovernance(govData as GovernanceSettings);
      } else {
        // Create default governance settings
        await initializeDefaultGovernance();
      }
    } catch (error) {
      console.error('Error loading entitlements:', error);
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

  async function initializeDefaultPlan() {
    if (!profile?.org_id || !profile?.id) return;

    try {
      await supabase.from('organisation_plans').insert({
        org_id: profile.org_id,
        plan_tier: 'project',
        status: 'active',
        entitlements_json: {},
        created_by: profile.id,
      });
    } catch (error) {
      console.error('Error initializing default plan:', error);
    }
  }

  async function initializeDefaultGovernance() {
    if (!profile?.org_id || !profile?.id) return;

    try {
      const { data } = await supabase
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
        .single();

      if (data) {
        setGovernance(data as GovernanceSettings);
      }
    } catch (error) {
      console.error('Error initializing default governance:', error);
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
