interface ComplianceRunSnapshot {
  checkId: string;
  timestamp: string;
  issueIds: string[];
  issueSeverities: Record<string, string>;
  status: string;
  issuesCount: number;
}

interface ComplianceSettings {
  staleDaysThreshold: number;
  defaultPeriod: string | null;
}

interface IssueNote {
  issueId: string;
  note: string;
  timestamp: string;
  userId?: string;
}

const STORAGE_PREFIX = 'compliance_';

export class ComplianceMetadataStore {
  static getSnapshotKey(projectId: string): string {
    return `${STORAGE_PREFIX}snapshot_${projectId}`;
  }

  static getSettingsKey(orgId: string): string {
    return `${STORAGE_PREFIX}settings_${orgId}`;
  }

  static getNotesKey(projectId: string): string {
    return `${STORAGE_PREFIX}notes_${projectId}`;
  }

  static getLastSnapshot(projectId: string): ComplianceRunSnapshot | null {
    try {
      const key = this.getSnapshotKey(projectId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Compliance] Error reading snapshot:', error);
      return null;
    }
  }

  static saveSnapshot(projectId: string, snapshot: ComplianceRunSnapshot): void {
    try {
      const key = this.getSnapshotKey(projectId);
      localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (error) {
      console.error('[Compliance] Error saving snapshot:', error);
    }
  }

  static compareSnapshots(
    previous: ComplianceRunSnapshot | null,
    current: { issueIds: string[]; issueSeverities: Record<string, string> }
  ): {
    newIssues: string[];
    resolvedIssues: string[];
    severityChanges: Array<{ issueId: string; oldSeverity: string; newSeverity: string }>;
  } {
    if (!previous) {
      return {
        newIssues: current.issueIds,
        resolvedIssues: [],
        severityChanges: []
      };
    }

    const prevSet = new Set(previous.issueIds);
    const currSet = new Set(current.issueIds);

    const newIssues = current.issueIds.filter(id => !prevSet.has(id));
    const resolvedIssues = previous.issueIds.filter(id => !currSet.has(id));

    const severityChanges: Array<{ issueId: string; oldSeverity: string; newSeverity: string }> = [];
    for (const issueId of current.issueIds) {
      if (prevSet.has(issueId)) {
        const oldSeverity = previous.issueSeverities[issueId];
        const newSeverity = current.issueSeverities[issueId];
        if (oldSeverity && newSeverity && oldSeverity !== newSeverity) {
          severityChanges.push({ issueId, oldSeverity, newSeverity });
        }
      }
    }

    return { newIssues, resolvedIssues, severityChanges };
  }

  static getSettings(orgId: string): ComplianceSettings {
    try {
      const key = this.getSettingsKey(orgId);
      const data = localStorage.getItem(key);
      return data
        ? JSON.parse(data)
        : { staleDaysThreshold: 30, defaultPeriod: null };
    } catch (error) {
      console.error('[Compliance] Error reading settings:', error);
      return { staleDaysThreshold: 30, defaultPeriod: null };
    }
  }

  static setSettings(orgId: string, settings: Partial<ComplianceSettings>): void {
    try {
      const key = this.getSettingsKey(orgId);
      const existing = this.getSettings(orgId);
      const updated = { ...existing, ...settings };
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('[Compliance] Error saving settings:', error);
    }
  }

  static getNotes(projectId: string): IssueNote[] {
    try {
      const key = this.getNotesKey(projectId);
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[Compliance] Error reading notes:', error);
      return [];
    }
  }

  static addNote(projectId: string, issueId: string, note: string, userId?: string): void {
    try {
      const notes = this.getNotes(projectId);
      notes.push({
        issueId,
        note,
        timestamp: new Date().toISOString(),
        userId
      });
      const key = this.getNotesKey(projectId);
      localStorage.setItem(key, JSON.stringify(notes));
    } catch (error) {
      console.error('[Compliance] Error adding note:', error);
    }
  }

  static getNotesForIssue(projectId: string, issueId: string): IssueNote[] {
    const notes = this.getNotes(projectId);
    return notes.filter(n => n.issueId === issueId);
  }

  static isCheckStale(lastCheckDate: string, thresholdDays: number = 30): boolean {
    const lastCheck = new Date(lastCheckDate);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > thresholdDays;
  }

  static formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    return `${Math.floor(seconds / 2592000)} months ago`;
  }
}

export const MODULE_ROUTES: Record<string, string> = {
  objective: '/objectives',
  objectives: '/objectives',
  stakeholder: '/stakeholders',
  stakeholders: '/stakeholders',
  message: '/messages',
  messages: '/messages',
  activity: '/activities',
  activities: '/activities',
  indicator: '/monitoring',
  indicators: '/monitoring',
  monitoring: '/monitoring',
  evidence: '/monitoring',
  channel: '/channels',
  channels: '/channels',
  exploitation: '/uptake',
  uptake: '/uptake',
  strategy: '/strategy',
  publication: '/reports',
  publications: '/reports',
  report: '/reports',
  reports: '/reports',
  asset: '/assets',
  assets: '/assets',
  result_asset: '/assets',
  knowledge: '/knowledge',
  governance: '/governance',
  compliance: '/compliance',
  dashboard: '/',
  other: '/'
};

export function getModuleRoute(module: string): string {
  return MODULE_ROUTES[module.toLowerCase()] || '/dashboard';
}

// ---------- Programme Profiles ----------

export interface ProgrammeProfile {
  id: string;
  name: string;
  shortName: string;
  description: string;
  ruleScopes: string[];  // Which rule scopes / programme_profile values apply
}

export const EU_PROGRAMMES: ProgrammeProfile[] = [
  {
    id: 'horizon-europe',
    name: 'Horizon Europe',
    shortName: 'HE',
    description: 'EU research and innovation framework programme (2021-2027). Strict requirements for open access, data management, exploitation of results, and public engagement.',
    ruleScopes: ['Common', 'Horizon Europe']
  },
  {
    id: 'erasmus-plus',
    name: 'Erasmus+',
    shortName: 'E+',
    description: 'EU programme for education, training, youth and sport. Focus on dissemination to educational communities and multiplier events.',
    ruleScopes: ['Common', 'Erasmus+']
  },
  {
    id: 'creative-europe',
    name: 'Creative Europe',
    shortName: 'CE',
    description: 'Support programme for cultural, creative and audiovisual sectors. Emphasis on audience development and cultural engagement.',
    ruleScopes: ['Common', 'Creative Europe']
  },
  {
    id: 'life',
    name: 'LIFE Programme',
    shortName: 'LIFE',
    description: 'EU funding instrument for environment and climate action. Requires replication plans and policy impact communication.',
    ruleScopes: ['Common', 'LIFE']
  },
  {
    id: 'interreg',
    name: 'Interreg / ETC',
    shortName: 'INT',
    description: 'European Territorial Cooperation programmes. Cross-border dissemination and stakeholder engagement requirements.',
    ruleScopes: ['Common', 'Interreg']
  },
  {
    id: 'digital-europe',
    name: 'Digital Europe Programme',
    shortName: 'DEP',
    description: 'EU programme for digital transformation. Focus on digital skills dissemination and technology uptake.',
    ruleScopes: ['Common', 'Digital Europe']
  },
  {
    id: 'custom',
    name: 'Custom / Other',
    shortName: 'Custom',
    description: 'Select this if your programme is not listed, or to use only the common EU rules plus your own custom rules.',
    ruleScopes: ['Common']
  }
];

// ---------- Custom Rules ----------

export interface CustomRule {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  module: string;
  passCriteria: string;
  active: boolean;
  createdAt: string;
  createdBy?: string;
  scope: 'organisation' | 'project';
}

// Programme profile storage (per project)
export class ComplianceProgrammeStore {
  private static getKey(projectId: string): string {
    return `${STORAGE_PREFIX}programme_${projectId}`;
  }

  static getSelectedProgramme(projectId: string): string {
    try {
      return localStorage.getItem(this.getKey(projectId)) || 'horizon-europe';
    } catch {
      return 'horizon-europe';
    }
  }

  static setSelectedProgramme(projectId: string, programmeId: string): void {
    try {
      localStorage.setItem(this.getKey(projectId), programmeId);
    } catch (error) {
      console.error('[Compliance] Error saving programme:', error);
    }
  }

  static getProgrammeProfile(projectId: string): ProgrammeProfile {
    const id = this.getSelectedProgramme(projectId);
    return EU_PROGRAMMES.find(p => p.id === id) || EU_PROGRAMMES[0];
  }
}

// Custom rules storage (per org or per project)
export class CustomRulesStore {
  private static getOrgKey(orgId: string): string {
    return `${STORAGE_PREFIX}custom_rules_org_${orgId}`;
  }

  private static getProjectKey(projectId: string): string {
    return `${STORAGE_PREFIX}custom_rules_project_${projectId}`;
  }

  static getOrgRules(orgId: string): CustomRule[] {
    try {
      const data = localStorage.getItem(this.getOrgKey(orgId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static getProjectRules(projectId: string): CustomRule[] {
    try {
      const data = localStorage.getItem(this.getProjectKey(projectId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static getAllCustomRules(orgId: string, projectId: string): CustomRule[] {
    return [...this.getOrgRules(orgId), ...this.getProjectRules(projectId)];
  }

  static addRule(orgId: string, projectId: string, rule: Omit<CustomRule, 'id' | 'createdAt'>): CustomRule {
    const newRule: CustomRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    try {
      if (rule.scope === 'organisation') {
        const rules = this.getOrgRules(orgId);
        rules.push(newRule);
        localStorage.setItem(this.getOrgKey(orgId), JSON.stringify(rules));
      } else {
        const rules = this.getProjectRules(projectId);
        rules.push(newRule);
        localStorage.setItem(this.getProjectKey(projectId), JSON.stringify(rules));
      }
    } catch (error) {
      console.error('[Compliance] Error saving custom rule:', error);
    }

    return newRule;
  }

  static updateRule(orgId: string, projectId: string, ruleId: string, updates: Partial<CustomRule>): void {
    try {
      // Try org rules first
      const orgRules = this.getOrgRules(orgId);
      const orgIdx = orgRules.findIndex(r => r.id === ruleId);
      if (orgIdx >= 0) {
        orgRules[orgIdx] = { ...orgRules[orgIdx], ...updates };
        localStorage.setItem(this.getOrgKey(orgId), JSON.stringify(orgRules));
        return;
      }

      // Then project rules
      const projectRules = this.getProjectRules(projectId);
      const projIdx = projectRules.findIndex(r => r.id === ruleId);
      if (projIdx >= 0) {
        projectRules[projIdx] = { ...projectRules[projIdx], ...updates };
        localStorage.setItem(this.getProjectKey(projectId), JSON.stringify(projectRules));
      }
    } catch (error) {
      console.error('[Compliance] Error updating custom rule:', error);
    }
  }

  static deleteRule(orgId: string, projectId: string, ruleId: string): void {
    try {
      const orgRules = this.getOrgRules(orgId).filter(r => r.id !== ruleId);
      localStorage.setItem(this.getOrgKey(orgId), JSON.stringify(orgRules));

      const projectRules = this.getProjectRules(projectId).filter(r => r.id !== ruleId);
      localStorage.setItem(this.getProjectKey(projectId), JSON.stringify(projectRules));
    } catch (error) {
      console.error('[Compliance] Error deleting custom rule:', error);
    }
  }
}

// ---------- Custom Rule Verdicts ----------

export interface CustomRuleVerdict {
  ruleId: string;
  ruleCode: string;
  ruleTitle: string;
  ruleSeverity: string;
  module: string;
  verdict: 'pass' | 'fail' | 'not-assessed';
  note: string;
  assessedAt: string;
  assessedBy?: string;
}

export interface CustomRuleVerdictSet {
  checkId: string;
  projectId: string;
  verdicts: CustomRuleVerdict[];
  assessedAt: string;
}

export class CustomRuleVerdictStore {
  private static getKey(projectId: string): string {
    return `${STORAGE_PREFIX}verdicts_${projectId}`;
  }

  static getLatestVerdicts(projectId: string): CustomRuleVerdictSet | null {
    try {
      const data = localStorage.getItem(this.getKey(projectId));
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static saveVerdicts(projectId: string, verdictSet: CustomRuleVerdictSet): void {
    try {
      localStorage.setItem(this.getKey(projectId), JSON.stringify(verdictSet));
    } catch (error) {
      console.error('[Compliance] Error saving verdicts:', error);
    }
  }

  static getVerdictForRule(projectId: string, ruleId: string): CustomRuleVerdict | null {
    const set = this.getLatestVerdicts(projectId);
    if (!set) return null;
    return set.verdicts.find(v => v.ruleId === ruleId) || null;
  }
}

export type { ComplianceRunSnapshot, ComplianceSettings, IssueNote };
