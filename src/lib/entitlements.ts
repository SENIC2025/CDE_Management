// Types and utilities for Plans & Governance module

export type PlanTier = 'project' | 'portfolio' | 'organisation' | 'enterprise';
export type PlanStatus = 'active' | 'trial' | 'suspended';
export type MethodologyGovernanceMode = 'project_only' | 'org_approved';
export type TemplateGovernanceMode = 'project_only' | 'org_shared' | 'org_locked';

export interface Entitlements {
  max_projects: number | null; // null = unlimited
  max_members: number | null; // null = unlimited
  max_storage_gb: number | null; // null = unlimited (or custom)
  portfolio_dashboard_enabled: boolean;
  cross_project_reporting_enabled: boolean;
  shared_templates_enabled: boolean;
  shared_indicator_library_enabled: boolean;
  org_level_methodology_enabled: boolean;
  org_defaults_enabled: boolean;
  export_branding_enabled: boolean;
  compliance_profiles_enabled: boolean;
  override_governance_enabled: boolean;
  api_access_enabled: boolean;
  custom_compliance_rules_enabled: boolean;
  dedicated_account_manager: boolean;
  sla_support_enabled: boolean;
}

export interface PlanCatalog {
  plan_tier: PlanTier;
  name: string;
  description: string;
  default_entitlements_json: Entitlements;
  created_at: string;
  updated_at: string;
}

export interface OrganisationPlan {
  id: string;
  org_id: string;
  plan_tier: PlanTier;
  status: PlanStatus;
  starts_at: string | null;
  ends_at: string | null;
  entitlements_json: Partial<Entitlements>;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  // Stripe billing fields
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  billing_interval?: 'monthly' | 'annual' | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

export interface GovernanceSettings {
  id: string;
  org_id: string;
  org_defaults_json: {
    hourly_rate_default?: number;
    decision_support_defaults?: Record<string, any>;
    compliance_profile?: string;
    [key: string]: any;
  };
  methodology_governance_mode: MethodologyGovernanceMode;
  template_governance_mode: TemplateGovernanceMode;
  branding_json: {
    logo_url?: string;
    footer_text?: string;
    disclaimer_text?: string;
  };
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface OrganisationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}

// ── Pricing Configuration ────────────────────────────────────────
// All prices in EUR. These are the source of truth for the Plans page.
// Stripe Price IDs are configured via environment variables.

export const PRICING = {
  project: {
    monthly: 49,
    annual: 39, // ~20% discount
    trialDays: 30,
    includedProjects: 1,
    includedSeats: 5,
    includedStorageGb: 5,
    addons: {
      project: 35, // per additional project/month
      seat: 8,     // per additional seat/month
      storage: 5,  // per additional GB/month
    },
  },
  portfolio: {
    monthly: 99,
    annual: 79, // ~20% discount
    trialDays: 0,
    includedProjects: 3,
    includedSeats: 10,
    includedStorageGb: 25,
    addons: {
      project: 30,
      seat: 6,
      storage: 4,
    },
  },
  organisation: {
    monthly: 299,
    annual: 239, // ~20% discount
    trialDays: 0,
    includedProjects: 10,
    includedSeats: 25,
    includedStorageGb: 100,
    addons: {
      project: 25,
      seat: 5,
      storage: 3,
    },
  },
  enterprise: {
    monthly: null, // custom
    annual: null,
    trialDays: 0,
    includedProjects: null, // unlimited
    includedSeats: null, // unlimited
    includedStorageGb: 500,
    addons: {
      project: 0, // included
      seat: 0,    // included
      storage: 0, // custom
    },
  },
} as const;

// ── Default Entitlements ─────────────────────────────────────────

export const DEFAULT_ENTITLEMENTS: Record<PlanTier, Entitlements> = {
  project: {
    max_projects: 1,
    max_members: 5,
    max_storage_gb: 5,
    portfolio_dashboard_enabled: false,
    cross_project_reporting_enabled: false,
    shared_templates_enabled: false,
    shared_indicator_library_enabled: false,
    org_level_methodology_enabled: false,
    org_defaults_enabled: false,
    export_branding_enabled: false,
    compliance_profiles_enabled: true,
    override_governance_enabled: true,
    api_access_enabled: false,
    custom_compliance_rules_enabled: false,
    dedicated_account_manager: false,
    sla_support_enabled: false,
  },
  portfolio: {
    max_projects: 3,
    max_members: 10,
    max_storage_gb: 25,
    portfolio_dashboard_enabled: true,
    cross_project_reporting_enabled: true,
    shared_templates_enabled: true,
    shared_indicator_library_enabled: true,
    org_level_methodology_enabled: false,
    org_defaults_enabled: true,
    export_branding_enabled: true,
    compliance_profiles_enabled: true,
    override_governance_enabled: true,
    api_access_enabled: false,
    custom_compliance_rules_enabled: false,
    dedicated_account_manager: false,
    sla_support_enabled: false,
  },
  organisation: {
    max_projects: 10,
    max_members: 25,
    max_storage_gb: 100,
    portfolio_dashboard_enabled: true,
    cross_project_reporting_enabled: true,
    shared_templates_enabled: true,
    shared_indicator_library_enabled: true,
    org_level_methodology_enabled: true,
    org_defaults_enabled: true,
    export_branding_enabled: true,
    compliance_profiles_enabled: true,
    override_governance_enabled: true,
    api_access_enabled: false,
    custom_compliance_rules_enabled: true,
    dedicated_account_manager: false,
    sla_support_enabled: false,
  },
  enterprise: {
    max_projects: null,
    max_members: null,
    max_storage_gb: 500,
    portfolio_dashboard_enabled: true,
    cross_project_reporting_enabled: true,
    shared_templates_enabled: true,
    shared_indicator_library_enabled: true,
    org_level_methodology_enabled: true,
    org_defaults_enabled: true,
    export_branding_enabled: true,
    compliance_profiles_enabled: true,
    override_governance_enabled: true,
    api_access_enabled: true,
    custom_compliance_rules_enabled: true,
    dedicated_account_manager: true,
    sla_support_enabled: true,
  },
};

// ── Helpers ──────────────────────────────────────────────────────

// Get effective entitlements by merging plan defaults with org overrides
export function getEffectiveEntitlements(
  planTier: PlanTier,
  overrides: Partial<Entitlements>
): Entitlements {
  const defaults = DEFAULT_ENTITLEMENTS[planTier];
  return { ...defaults, ...overrides };
}

// Validate entitlements object
export function validateEntitlements(entitlements: any): Entitlements {
  return {
    max_projects: entitlements.max_projects ?? null,
    max_members: entitlements.max_members ?? null,
    max_storage_gb: entitlements.max_storage_gb ?? null,
    portfolio_dashboard_enabled: Boolean(entitlements.portfolio_dashboard_enabled ?? false),
    cross_project_reporting_enabled: Boolean(entitlements.cross_project_reporting_enabled ?? false),
    shared_templates_enabled: Boolean(entitlements.shared_templates_enabled ?? false),
    shared_indicator_library_enabled: Boolean(entitlements.shared_indicator_library_enabled ?? false),
    org_level_methodology_enabled: Boolean(entitlements.org_level_methodology_enabled ?? false),
    org_defaults_enabled: Boolean(entitlements.org_defaults_enabled ?? false),
    export_branding_enabled: Boolean(entitlements.export_branding_enabled ?? false),
    compliance_profiles_enabled: Boolean(entitlements.compliance_profiles_enabled ?? true),
    override_governance_enabled: Boolean(entitlements.override_governance_enabled ?? true),
    api_access_enabled: Boolean(entitlements.api_access_enabled ?? false),
    custom_compliance_rules_enabled: Boolean(entitlements.custom_compliance_rules_enabled ?? false),
    dedicated_account_manager: Boolean(entitlements.dedicated_account_manager ?? false),
    sla_support_enabled: Boolean(entitlements.sla_support_enabled ?? false),
  };
}

// Check if entitlement key is valid
export function isValidEntitlementKey(key: string): key is keyof Entitlements {
  return key in DEFAULT_ENTITLEMENTS.project;
}

// ── Plan Display Helpers ─────────────────────────────────────────

export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  project: 'Project',
  portfolio: 'Portfolio',
  organisation: 'Organisation',
  enterprise: 'Enterprise',
};

export const PLAN_ORDER: PlanTier[] = ['project', 'portfolio', 'organisation', 'enterprise'];

export function getPlanDisplayName(tier: PlanTier): string {
  return PLAN_DISPLAY_NAMES[tier] || tier;
}

export function getNextPlanTier(tier: PlanTier): PlanTier | null {
  const idx = PLAN_ORDER.indexOf(tier);
  return idx < PLAN_ORDER.length - 1 ? PLAN_ORDER[idx + 1] : null;
}

// ── Storage Helpers ──────────────────────────────────────────────

export interface StorageUsage {
  used_bytes: number;
  limit_bytes: number;
  percentage: number;
  tier: 'ok' | 'warning' | 'critical' | 'exceeded';
}

export function calculateStorageUsage(usedMb: number, limitGb: number | null): StorageUsage {
  if (limitGb === null) {
    return { used_bytes: usedMb * 1024 * 1024, limit_bytes: Infinity, percentage: 0, tier: 'ok' };
  }
  const limitMb = limitGb * 1024;
  const percentage = limitMb > 0 ? Math.round((usedMb / limitMb) * 100) : 0;
  let tier: StorageUsage['tier'] = 'ok';
  if (percentage >= 100) tier = 'exceeded';
  else if (percentage >= 90) tier = 'critical';
  else if (percentage >= 70) tier = 'warning';

  return {
    used_bytes: usedMb * 1024 * 1024,
    limit_bytes: limitGb * 1024 * 1024 * 1024,
    percentage,
    tier,
  };
}

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ── Entitlement Checks ───────────────────────────────────────────

export interface EntitlementCheck {
  allowed: boolean;
  reason?: string;
}

// EntitlementsService: centralized entitlement checking
export class EntitlementsService {
  constructor(
    private entitlements: Entitlements,
    private planTier: PlanTier,
    private status: PlanStatus
  ) {}

  // Check if a specific entitlement is enabled
  check(key: keyof Entitlements): EntitlementCheck {
    if (this.status === 'suspended') {
      return {
        allowed: false,
        reason: 'Organisation plan is suspended. Please contact your administrator.',
      };
    }

    const value = this.entitlements[key];
    if (typeof value === 'boolean') {
      return {
        allowed: value,
        reason: value ? undefined : `This feature requires the ${this.getRequiredPlanForFeature(key)} plan or higher.`,
      };
    }

    return { allowed: true };
  }

  // Check project limit
  canCreateProject(currentCount: number): EntitlementCheck {
    if (this.status === 'suspended') {
      return {
        allowed: false,
        reason: 'Organisation plan is suspended. Please contact your administrator.',
      };
    }

    const maxProjects = this.entitlements.max_projects;
    if (maxProjects === null) {
      return { allowed: true };
    }

    if (currentCount >= maxProjects) {
      const next = getNextPlanTier(this.planTier);
      const upgradeHint = next ? ` Upgrade to ${getPlanDisplayName(next)} or add projects as an add-on.` : '';
      return {
        allowed: false,
        reason: `Project limit reached (${maxProjects}).${upgradeHint}`,
      };
    }

    return { allowed: true };
  }

  // Check member limit
  canAddMember(currentCount: number): EntitlementCheck {
    if (this.status === 'suspended') {
      return {
        allowed: false,
        reason: 'Organisation plan is suspended. Please contact your administrator.',
      };
    }

    const maxMembers = this.entitlements.max_members;
    if (maxMembers === null) {
      return { allowed: true };
    }

    if (currentCount >= maxMembers) {
      const next = getNextPlanTier(this.planTier);
      const upgradeHint = next ? ` Upgrade to ${getPlanDisplayName(next)} or add seats as an add-on.` : '';
      return {
        allowed: false,
        reason: `Seat limit reached (${maxMembers}).${upgradeHint}`,
      };
    }

    return { allowed: true };
  }

  // Check storage limit (usedMb in megabytes)
  canUploadFile(fileSizeMb: number, currentUsageMb: number): EntitlementCheck {
    if (this.status === 'suspended') {
      return {
        allowed: false,
        reason: 'Organisation plan is suspended. Please contact your administrator.',
      };
    }

    const maxStorageGb = this.entitlements.max_storage_gb;
    if (maxStorageGb === null) {
      return { allowed: true };
    }

    const limitMb = maxStorageGb * 1024;
    if (currentUsageMb + fileSizeMb > limitMb) {
      return {
        allowed: false,
        reason: `Storage limit reached (${maxStorageGb} GB). Upgrade your plan or purchase additional storage.`,
      };
    }

    return { allowed: true };
  }

  // Get all enabled features
  getEnabledFeatures(): string[] {
    const features: string[] = [];
    Object.entries(this.entitlements).forEach(([key, value]) => {
      if (typeof value === 'boolean' && value) {
        features.push(key);
      }
    });
    return features;
  }

  // Get required plan for a feature
  private getRequiredPlanForFeature(key: keyof Entitlements): string {
    if (DEFAULT_ENTITLEMENTS.portfolio[key]) {
      return 'Portfolio';
    }
    if (DEFAULT_ENTITLEMENTS.organisation[key]) {
      return 'Organisation';
    }
    if (DEFAULT_ENTITLEMENTS.enterprise[key]) {
      return 'Enterprise';
    }
    return 'Project';
  }

  // Get plan tier
  getPlanTier(): PlanTier {
    return this.planTier;
  }

  // Get plan status
  getStatus(): PlanStatus {
    return this.status;
  }

  // Get entitlements
  getEntitlements(): Entitlements {
    return this.entitlements;
  }
}
