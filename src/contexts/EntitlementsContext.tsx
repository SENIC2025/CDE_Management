import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useOrganisation } from './OrganisationContext';
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
import { getBillingInfo, type BillingInfo } from '../lib/stripe';

interface EntitlementsContextType {
  entitlements: Entitlements | null;
  planTier: PlanTier | null;
  planStatus: PlanStatus | null;
  governance: GovernanceSettings | null;
  billingInfo: BillingInfo | null;
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
  const { currentOrg } = useOrganisation();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [planTier, setPlanTier] = useState<PlanTier | null>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [governance, setGovernance] = useState<GovernanceSettings | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [service, setService] = useState<EntitlementsService | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  // Use org ID from OrganisationContext (RPC-loaded) as fallback when profile.org_id is null
  const effectiveOrgId = profile?.org_id || currentOrg?.id;

  useEffect(() => {
    if (effectiveOrgId) {
      loadEntitlements();
      checkOrgAdmin();
    } else {
      setLoading(false);
    }
  }, [effectiveOrgId, profile?.id]);

  async function checkOrgAdmin() {
    if (!effectiveOrgId) {
      setIsOrgAdmin(false);
      return;
    }

    try {
      // Use SECURITY DEFINER RPC to bypass RLS on organisation_members
      const { data, error } = await supabase.rpc('is_org_admin', {
        p_org_id: effectiveOrgId
      });

      if (error) {
        console.error('[Entitlements] is_org_admin RPC failed:', error.message);
        // Fallback: check via list_my_organisations RPC
        const { data: orgs } = await supabase.rpc('list_my_organisations');
        const match = orgs?.find((o: any) => o.org_id === effectiveOrgId);
        setIsOrgAdmin(match?.my_role === 'admin');
        return;
      }

      setIsOrgAdmin(data === true);
    } catch (error) {
      console.error('[Entitlements] Error checking org admin status:', error);
      setIsOrgAdmin(false);
    }
  }

  async function loadEntitlements() {
    if (!effectiveOrgId) return;

    setLoading(true);
    try {
      // Load effective entitlements via secure RPC
      const { data: entitlementsData, error: entitlementsError } = await supabase
        .rpc('get_effective_entitlements', { p_org_id: effectiveOrgId });

      if (entitlementsError) {
        console.error('[Entitlements] Error loading entitlements via RPC:', entitlementsError);
        throw entitlementsError;
      }

      // Parse entitlements - extract _plan_tier and _plan_status if present (from updated RPC)
      const rawData = entitlementsData as any;
      const actualTier: PlanTier = rawData?._plan_tier || null;
      const actualStatus: PlanStatus = rawData?._plan_status || 'active';

      // Remove internal fields before storing as entitlements
      const { _plan_tier, _plan_status, ...cleanEntitlements } = rawData || {};
      const effectiveEntitlements = cleanEntitlements as Entitlements;

      // Use actual plan tier from RPC if available, otherwise infer from entitlements
      let detectedTier: PlanTier = actualTier || 'project';
      if (!actualTier) {
        // Fallback inference for older RPC version without _plan_tier
        if (effectiveEntitlements.max_projects === null) {
          detectedTier = 'organisation';
        } else if (effectiveEntitlements.max_projects > 1) {
          detectedTier = 'portfolio';
        }
      }

      setEntitlements(effectiveEntitlements);
      setPlanTier(detectedTier);
      setPlanStatus(actualStatus);

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
        .eq('org_id', effectiveOrgId)
        .maybeSingle();

      if (govError) {
        console.error('[Entitlements] Error loading governance settings:', govError);
      } else if (govData) {
        setGovernance(govData as GovernanceSettings);
      } else {
        // Create default governance settings
        await initializeDefaultGovernance();
      }

      // Load billing info (Stripe subscription data)
      try {
        const billing = await getBillingInfo(effectiveOrgId);
        setBillingInfo(billing);
      } catch (billingError) {
        // Non-fatal — billing info is supplementary
        console.warn('[Entitlements] Error loading billing info:', billingError);
        setBillingInfo(null);
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
    if (!effectiveOrgId || !profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('organisation_governance_settings')
        .insert({
          org_id: effectiveOrgId,
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
        billingInfo,
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
