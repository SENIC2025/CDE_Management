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
  evidence: '/monitoring',
  publication: '/reports',
  publications: '/reports',
  report: '/reports',
  reports: '/reports'
};

export function getModuleRoute(module: string): string {
  return MODULE_ROUTES[module.toLowerCase()] || '/dashboard';
}

export type { ComplianceRunSnapshot, ComplianceSettings, IssueNote };
