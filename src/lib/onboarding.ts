export interface OnboardingChecklist {
  plan_reviewed: boolean;
  project_created: boolean;
  reporting_periods_set: boolean;
  template_pack_applied: boolean;
  decision_support_configured: boolean;
  methodology_approved: boolean;
  members_invited: boolean;
}

export interface OnboardingStatus {
  id: string;
  org_id: string;
  project_id: string | null;
  checklist_json: OnboardingChecklist;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface UserLastSeen {
  user_id: string;
  org_id: string;
  last_seen_at: string;
}

export const ONBOARDING_STEPS = [
  {
    key: 'plan_reviewed' as keyof OnboardingChecklist,
    title: 'Review Plan & Limits',
    description: 'Understand your organisation plan and feature entitlements',
  },
  {
    key: 'project_created' as keyof OnboardingChecklist,
    title: 'Create Your First Project',
    description: 'Set up your first CDE project with basic information',
  },
  {
    key: 'reporting_periods_set' as keyof OnboardingChecklist,
    title: 'Configure Reporting Periods',
    description: 'Define reporting periods for tracking progress',
  },
  {
    key: 'template_pack_applied' as keyof OnboardingChecklist,
    title: 'Apply Template Pack',
    description: 'Seed your project with templates for objectives, activities, and more',
  },
  {
    key: 'decision_support_configured' as keyof OnboardingChecklist,
    title: 'Set Decision Support Defaults',
    description: 'Configure hourly rates and key decision-making thresholds',
  },
  {
    key: 'methodology_approved' as keyof OnboardingChecklist,
    title: 'Establish Methodology',
    description: 'Create and approve your project methodology',
  },
  {
    key: 'members_invited' as keyof OnboardingChecklist,
    title: 'Invite Team Members',
    description: 'Add team members and assign project roles',
  },
];

export function calculateOnboardingProgress(checklist: OnboardingChecklist): number {
  const completed = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(checklist).length;
  return Math.round((completed / total) * 100);
}

export function isOnboardingComplete(checklist: OnboardingChecklist): boolean {
  return Object.values(checklist).every(Boolean);
}
