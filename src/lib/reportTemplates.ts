/**
 * Report Templates
 *
 * Pre-built report structures aligned with EU programme reporting needs.
 * Each template defines sections that auto-populate from project data
 * and include editable narrative blocks for user commentary.
 */

export interface ReportSection {
  id: string;
  title: string;
  type: 'narrative' | 'data-objectives' | 'data-stakeholders' | 'data-activities' | 'data-indicators' | 'data-evidence' | 'data-compliance' | 'data-exploitation' | 'data-channels';
  content: string;     // User-editable narrative content
  placeholder: string; // Guidance text shown when content is empty
  required: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string;
  sections: ReportSection[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'periodic',
    name: 'Periodic Report',
    description: 'Standard reporting period summary with activity overview, indicator progress, and evidence snapshot. Ideal for mid-term or annual reporting.',
    icon: 'calendar',
    color: 'blue',
    sections: [
      {
        id: 'exec-summary',
        title: 'Executive Summary',
        type: 'narrative',
        content: '',
        placeholder: 'Summarise the key achievements, challenges, and next steps for this reporting period. This section is typically 2-3 paragraphs.',
        required: true
      },
      {
        id: 'objectives-progress',
        title: 'Objectives Progress',
        type: 'data-objectives',
        content: '',
        placeholder: 'Add any commentary on objective progress, changes in strategy, or deviations from the original plan.',
        required: true
      },
      {
        id: 'activities-summary',
        title: 'Activities Completed',
        type: 'data-activities',
        content: '',
        placeholder: 'Describe notable activities, events, or campaigns completed during this period. Highlight any that exceeded expectations or faced delays.',
        required: true
      },
      {
        id: 'indicators-review',
        title: 'Indicator Progress',
        type: 'data-indicators',
        content: '',
        placeholder: 'Comment on indicator trends, any KPIs that are ahead or behind target, and actions planned to address gaps.',
        required: true
      },
      {
        id: 'evidence-summary',
        title: 'Evidence & Documentation',
        type: 'data-evidence',
        content: '',
        placeholder: 'Note any significant evidence items collected, gaps in documentation, or pending uploads.',
        required: false
      },
      {
        id: 'challenges',
        title: 'Challenges & Mitigations',
        type: 'narrative',
        content: '',
        placeholder: 'Describe any challenges encountered during this period and the mitigations applied or planned.',
        required: true
      },
      {
        id: 'next-steps',
        title: 'Next Steps',
        type: 'narrative',
        content: '',
        placeholder: 'Outline the planned activities, milestones, and priorities for the next reporting period.',
        required: true
      }
    ]
  },
  {
    id: 'final',
    name: 'Final Report',
    description: 'Comprehensive end-of-project report covering all CDE modules, exploitation outcomes, sustainability plan, and lessons learned.',
    icon: 'file-check',
    color: 'green',
    sections: [
      {
        id: 'exec-summary',
        title: 'Executive Summary',
        type: 'narrative',
        content: '',
        placeholder: 'Provide a comprehensive overview of the project\'s CDE achievements over its entire lifecycle. Highlight key results and impact.',
        required: true
      },
      {
        id: 'objectives-final',
        title: 'Objectives Achievement',
        type: 'data-objectives',
        content: '',
        placeholder: 'Assess the degree to which each CDE objective was achieved. For any unmet objectives, explain the reasons and compensating actions taken.',
        required: true
      },
      {
        id: 'stakeholders-final',
        title: 'Stakeholder Engagement',
        type: 'data-stakeholders',
        content: '',
        placeholder: 'Summarise stakeholder engagement across the project. Which groups were most/least engaged? What lessons were learned about stakeholder outreach?',
        required: true
      },
      {
        id: 'activities-final',
        title: 'Activity Summary',
        type: 'data-activities',
        content: '',
        placeholder: 'Provide an overview of all CDE activities conducted. Highlight the most impactful activities and any that were cancelled or modified.',
        required: true
      },
      {
        id: 'channels-final',
        title: 'Channel Performance',
        type: 'data-channels',
        content: '',
        placeholder: 'Evaluate channel effectiveness. Which channels delivered the best engagement? Any recommendations for future projects?',
        required: false
      },
      {
        id: 'indicators-final',
        title: 'Indicators & Results',
        type: 'data-indicators',
        content: '',
        placeholder: 'Present final indicator values against targets. Explain any significant over- or under-performance.',
        required: true
      },
      {
        id: 'evidence-final',
        title: 'Evidence & Documentation',
        type: 'data-evidence',
        content: '',
        placeholder: 'Confirm completeness of evidence documentation. Note any gaps and how they were addressed.',
        required: true
      },
      {
        id: 'exploitation-final',
        title: 'Exploitation & Sustainability',
        type: 'data-exploitation',
        content: '',
        placeholder: 'Describe the exploitation plan for project results. What steps ensure sustainability beyond the project? What IP or licensing arrangements are in place?',
        required: true
      },
      {
        id: 'compliance-final',
        title: 'Compliance Status',
        type: 'data-compliance',
        content: '',
        placeholder: 'Summarise the final compliance status. Note any outstanding issues and the plan to resolve them before project closure.',
        required: true
      },
      {
        id: 'lessons',
        title: 'Lessons Learned',
        type: 'narrative',
        content: '',
        placeholder: 'What worked well? What would you do differently? What advice would you give to similar projects? This section is valuable for the EU programme and future projects.',
        required: true
      }
    ]
  },
  {
    id: 'steering',
    name: 'Steering Committee Brief',
    description: 'Concise executive-level brief with key metrics, risk flags, and decisions needed. Designed for 10-minute board presentations.',
    icon: 'presentation',
    color: 'purple',
    sections: [
      {
        id: 'status-overview',
        title: 'Status at a Glance',
        type: 'narrative',
        content: '',
        placeholder: 'One paragraph summarising the current project status. Use traffic-light language: what is green, amber, red?',
        required: true
      },
      {
        id: 'key-metrics',
        title: 'Key Metrics',
        type: 'data-indicators',
        content: '',
        placeholder: 'Highlight the 3-5 most important KPIs and their current status. Focus on metrics that drive decisions.',
        required: true
      },
      {
        id: 'compliance-status',
        title: 'Compliance Score',
        type: 'data-compliance',
        content: '',
        placeholder: 'Brief note on compliance posture — any critical issues requiring steering committee attention?',
        required: true
      },
      {
        id: 'risks-flags',
        title: 'Risks & Flags',
        type: 'narrative',
        content: '',
        placeholder: 'List the top 3-5 risks or decision-support flags. For each: describe the risk, its impact, and proposed mitigation.',
        required: true
      },
      {
        id: 'decisions-needed',
        title: 'Decisions Needed',
        type: 'narrative',
        content: '',
        placeholder: 'List any decisions that require steering committee approval. Be specific about what you need and by when.',
        required: true
      },
      {
        id: 'next-milestones',
        title: 'Next Milestones',
        type: 'narrative',
        content: '',
        placeholder: 'List the key milestones for the next 1-3 months with expected dates.',
        required: false
      }
    ]
  },
  {
    id: 'funder',
    name: 'Funder Submission',
    description: 'Structured report aligned with EU funder requirements. Includes mandatory sections, deliverable tracking, evidence linkage, and compliance attestation.',
    icon: 'landmark',
    color: 'amber',
    sections: [
      {
        id: 'project-summary',
        title: 'Project Summary',
        type: 'narrative',
        content: '',
        placeholder: 'Official project summary as per the Grant Agreement. Include project acronym, reference number, and consortium overview.',
        required: true
      },
      {
        id: 'objectives-status',
        title: 'Objectives & Deliverables',
        type: 'data-objectives',
        content: '',
        placeholder: 'Map each objective to its deliverables. Indicate completion status and any deviations from the Description of Action.',
        required: true
      },
      {
        id: 'activities-report',
        title: 'CDE Activities Report',
        type: 'data-activities',
        content: '',
        placeholder: 'Detailed account of CDE activities including type, date, participants, reach, and outcomes. This section must align with the activity plan in your Grant Agreement.',
        required: true
      },
      {
        id: 'stakeholders-engagement',
        title: 'Stakeholder Engagement Report',
        type: 'data-stakeholders',
        content: '',
        placeholder: 'Report on stakeholder engagement activities, feedback received, and how it influenced project direction.',
        required: true
      },
      {
        id: 'indicators-report',
        title: 'KPI Report',
        type: 'data-indicators',
        content: '',
        placeholder: 'Formal KPI reporting table with baseline, target, and current values. Include measurement methodology.',
        required: true
      },
      {
        id: 'evidence-report',
        title: 'Evidence & Means of Verification',
        type: 'data-evidence',
        content: '',
        placeholder: 'List all evidence items with their linkage to activities and indicator claims. Note any evidence gaps that need attention before submission.',
        required: true
      },
      {
        id: 'exploitation-report',
        title: 'Exploitation Plan',
        type: 'data-exploitation',
        content: '',
        placeholder: 'Describe the exploitation strategy for each key result. Include IP management, market analysis, and uptake pathway.',
        required: true
      },
      {
        id: 'compliance-attestation',
        title: 'Compliance Attestation',
        type: 'data-compliance',
        content: '',
        placeholder: 'Confirm compliance with programme requirements. List any waivers, deviations, or amendments. Include the latest compliance score and any outstanding issues.',
        required: true
      },
      {
        id: 'financial-note',
        title: 'Financial Summary Note',
        type: 'narrative',
        content: '',
        placeholder: 'Brief note on CDE-related expenditure against budget. Highlight any under/overspend and justification.',
        required: false
      }
    ]
  }
];

export function getTemplate(templateId: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES.find(t => t.id === templateId);
}

export function createSectionsFromTemplate(templateId: string): ReportSection[] {
  const template = getTemplate(templateId);
  if (!template) return [];
  return template.sections.map(s => ({ ...s, content: '' }));
}

/**
 * Parse legacy narrative_json into sections
 * Handles: JSON string with sections array, plain string, or empty
 */
export function parseLegacyNarrative(narrativeJson: string | null): ReportSection[] {
  if (!narrativeJson || narrativeJson === '{}' || narrativeJson === '[]') return [];

  try {
    const parsed = JSON.parse(narrativeJson);

    // New format: { sections: [...] }
    if (parsed.sections && Array.isArray(parsed.sections)) {
      return parsed.sections;
    }

    // Array of sections directly
    if (Array.isArray(parsed)) {
      return parsed;
    }

    return [];
  } catch {
    // Plain text — wrap in a single narrative section
    if (typeof narrativeJson === 'string' && narrativeJson.trim()) {
      return [{
        id: 'legacy-content',
        title: 'Report Content',
        type: 'narrative',
        content: narrativeJson,
        placeholder: '',
        required: false
      }];
    }
    return [];
  }
}

export function sectionsToJson(sections: ReportSection[]): string {
  return JSON.stringify({ sections });
}
