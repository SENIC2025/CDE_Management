// Types and utilities for Plans & Governance module

export type PlanTier = 'project' | 'portfolio' | 'organisation';
export type PlanStatus = 'active' | 'trial' | 'suspended';
export type MethodologyGovernanceMode = 'project_only' | 'org_approved';
export type TemplateGovernanceMode = 'project_only' | 'org_shared' | 'org_locked';

export interface Entitlements {
  max_projects: number | null; // null = unlimited
  portfolio_dashboard_enabled: boolean;
  cross_project_reporting_enabled: boolean;
  shared_templates_enabled: boolean;
  shared_indicator_library_enabled: boolean;
  org_level_methodology_enabled: boolean;
  org_defaults_enabled: boolean;
  export_branding_enabled: boolean;
  compliance_profiles_enabled: boolean;
  override_governance_enabled: boolean;
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

// Default entitlements for each tier
export const DEFAULT_ENTITLEMENTS: Record<PlanTier, Entitlements> = {
  project: {
    max_projects: 1,
    portfolio_dashboard_enabled: false,
    cross_project_reporting_enabled: false,
    shared_templates_enabled: false,
    shared_indicator_library_enabled: false,
    org_level_methodology_enabled: false,
    org_defaults_enabled: false,
    export_branding_enabled: false,
    compliance_profiles_enabled: true,
    override_governance_enabled: true,
  },
  portfolio: {
    max_projects: 10,
    portfolio_dashboard_enabled: true,
    cross_project_reporting_enabled: true,
    shared_templates_enabled: true,
    shared_indicator_library_enabled: true,
    org_level_methodology_enabled: false,
    org_defaults_enabled: true,
    export_branding_enabled: true,
    compliance_profiles_enabled: true,
    override_governance_enabled: true,
  },
  organisation: {
    max_projects: null,
    portfolio_dashboard_enabled: true,
    cross_project_reporting_enabled: true,
    shared_templates_enabled: true,
    shared_indicator_library_enabled: true,
    org_level_methodology_enabled: true,
    org_defaults_enabled: true,
    export_branding_enabled: true,
    compliance_profiles_enabled: true,
    override_governance_enabled: true,
  },
};

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
    portfolio_dashboard_enabled: Boolean(entitlements.portfolio_dashboard_enabled ?? false),
    cross_project_reporting_enabled: Boolean(entitlements.cross_project_reporting_enabled ?? false),
    shared_templates_enabled: Boolean(entitlements.shared_templates_enabled ?? false),
    shared_indicator_library_enabled: Boolean(entitlements.shared_indicator_library_enabled ?? false),
    org_level_methodology_enabled: Boolean(entitlements.org_level_methodology_enabled ?? false),
    org_defaults_enabled: Boolean(entitlements.org_defaults_enabled ?? false),
    export_branding_enabled: Boolean(entitlements.export_branding_enabled ?? false),
    compliance_profiles_enabled: Boolean(entitlements.compliance_profiles_enabled ?? true),
    override_governance_enabled: Boolean(entitlements.override_governance_enabled ?? true),
  };
}

// Check if entitlement key is valid
export function isValidEntitlementKey(key: string): key is keyof Entitlements {
  return key in DEFAULT_ENTITLEMENTS.project;
}

// EntitlementCheck result
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
        reason: value ? undefined : `This feature requires ${this.getRequiredPlanForFeature(key)} plan or higher.`,
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
      return {
        allowed: false,
        reason: `Project limit reached (${maxProjects}). Upgrade to ${this.getNextPlanTier()} plan to create more projects.`,
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
    return 'Project';
  }

  // Get next plan tier
  private getNextPlanTier(): string {
    if (this.planTier === 'project') return 'Portfolio';
    if (this.planTier === 'portfolio') return 'Organisation';
    return 'Organisation';
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
