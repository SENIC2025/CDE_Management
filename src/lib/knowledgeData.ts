/**
 * Knowledge Base Data
 *
 * EU Best Practices collection and Template Application History store.
 * Best practices are curated, read-only guidance cards for CDE work.
 * Application history is per-project localStorage for audit tracking.
 */

// ─── EU Best Practices ───

export interface BestPractice {
  id: string;
  title: string;
  description: string;
  programme: string; // 'all' | specific programme
  domain: 'communication' | 'dissemination' | 'exploitation' | 'general';
  phase: 'planning' | 'execution' | 'reporting' | 'all';
  tips: string[];
  source?: string;
}

export const EU_BEST_PRACTICES: BestPractice[] = [
  // ─── General / All Programmes ───
  {
    id: 'gen-01',
    title: 'Start CDE Planning from Day One',
    description: 'Communication, dissemination and exploitation should not be an afterthought. Begin planning activities, identifying stakeholders, and setting KPIs during the project kick-off phase.',
    programme: 'all',
    domain: 'general',
    phase: 'planning',
    tips: [
      'Appoint a CDE lead during the first consortium meeting',
      'Draft initial stakeholder mapping within the first month',
      'Set measurable KPIs before any activities begin',
      'Align CDE objectives with the Grant Agreement deliverables'
    ]
  },
  {
    id: 'gen-02',
    title: 'Track Everything with Evidence',
    description: 'EU reviewers expect documented proof for every claim. Build an evidence collection habit from the start — screenshots, analytics exports, signed attendance lists, media coverage.',
    programme: 'all',
    domain: 'general',
    phase: 'execution',
    tips: [
      'Capture screenshots of social media posts immediately after publishing',
      'Export analytics data monthly, not just at reporting time',
      'Get signed attendance lists at every event, no exceptions',
      'Maintain a running evidence log linked to each activity'
    ]
  },
  {
    id: 'gen-03',
    title: 'Report Outcomes, Not Just Outputs',
    description: 'Funders want to see impact, not just activity counts. "We published 50 posts" matters less than "Our posts reached 12,000 researchers, with 800 engaging directly."',
    programme: 'all',
    domain: 'general',
    phase: 'reporting',
    tips: [
      'Pair every activity count with an engagement metric',
      'Show before-and-after comparisons where possible',
      'Link activities to stakeholder behaviour changes',
      'Include qualitative feedback from target audiences'
    ]
  },
  {
    id: 'gen-04',
    title: 'Tailor Messages to Stakeholder Groups',
    description: 'A single message does not work for policymakers, researchers, and industry alike. Adapt language, channels, and value propositions for each audience segment.',
    programme: 'all',
    domain: 'communication',
    phase: 'planning',
    tips: [
      'Create separate message variants for each priority stakeholder group',
      'Use plain language for policy and citizen audiences',
      'Lead with data and methodology for academic audiences',
      'Emphasise ROI and market potential for industry stakeholders'
    ]
  },
  {
    id: 'gen-05',
    title: 'Build an Exploitation Plan Early',
    description: 'Exploitation is not just for the final report. Identify exploitable results, IP ownership, and uptake pathways from the beginning to avoid last-minute scrambles.',
    programme: 'all',
    domain: 'exploitation',
    phase: 'planning',
    tips: [
      'Map every key result to a potential exploitation pathway',
      'Clarify IP ownership in the consortium agreement',
      'Identify early adopters and pilot partners in the first year',
      'Document market potential and competitive landscape for each result'
    ]
  },

  // ─── Horizon Europe Specific ───
  {
    id: 'he-01',
    title: 'Horizon Europe: Open Access is Mandatory',
    description: 'All peer-reviewed publications must be open access. Plan for Gold or Green OA from the start, and budget article processing charges if using Gold OA.',
    programme: 'Horizon Europe',
    domain: 'dissemination',
    phase: 'planning',
    tips: [
      'Budget APCs (Article Processing Charges) in your financial plan',
      'Use institutional repositories for Green OA deposits',
      'Include OA requirements in subcontracting agreements',
      'Track publication DOIs and OA status in your evidence database'
    ]
  },
  {
    id: 'he-02',
    title: 'Horizon Europe: Use the EC Dissemination Channels',
    description: 'The EC offers platforms like CORDIS, Horizon Results Platform, and the Innovation Radar. Using them demonstrates engagement with the programme ecosystem.',
    programme: 'Horizon Europe',
    domain: 'dissemination',
    phase: 'execution',
    tips: [
      'Register your project on CORDIS with a compelling summary',
      'Submit key results to the Horizon Results Platform',
      'Participate in EC clustering events for your call topic',
      'Use the #HorizonEU hashtag and tag @EU_Commission in social posts'
    ]
  },
  {
    id: 'he-03',
    title: 'Horizon Europe: Data Management Plan Required',
    description: 'A Data Management Plan (DMP) must be submitted as a deliverable. It should cover FAIR principles, data sharing, and long-term preservation.',
    programme: 'Horizon Europe',
    domain: 'general',
    phase: 'planning',
    tips: [
      'Use the DMP template from the EC Participant Portal',
      'Address all four FAIR dimensions: Findable, Accessible, Interoperable, Reusable',
      'Identify which datasets will be open and which restricted',
      'Plan for data preservation beyond the project lifetime (min 5 years)'
    ]
  },

  // ─── Erasmus+ Specific ───
  {
    id: 'er-01',
    title: 'Erasmus+: Engage Multipliers Early',
    description: 'Multiplier Events are a key dissemination requirement. Identify and engage multiplier organisations — schools, universities, training centres — from the planning phase.',
    programme: 'Erasmus+',
    domain: 'dissemination',
    phase: 'planning',
    tips: [
      'Map multiplier organisations in each partner country',
      'Invite multipliers to advisory boards or steering committees',
      'Co-design dissemination materials with multiplier input',
      'Plan at least one Multiplier Event per partner country'
    ]
  },
  {
    id: 'er-02',
    title: 'Erasmus+: Document Intellectual Outputs Thoroughly',
    description: 'Intellectual Outputs require detailed documentation of development process, time investment, and quality assurance. Keep contemporaneous records.',
    programme: 'Erasmus+',
    domain: 'general',
    phase: 'execution',
    tips: [
      'Log development hours per partner, per output, monthly',
      'Version-control all output drafts and revisions',
      'Include peer review or external quality assurance evidence',
      'Document the pedagogical methodology behind each output'
    ]
  },

  // ─── Creative Europe Specific ───
  {
    id: 'ce-01',
    title: 'Creative Europe: Audience Development is Key',
    description: 'Creative Europe prioritises reaching new and diverse audiences. Your CDE strategy should demonstrate how you reach beyond traditional cultural audiences.',
    programme: 'Creative Europe',
    domain: 'communication',
    phase: 'execution',
    tips: [
      'Define and track audience segments by demographics and cultural access',
      'Partner with community organisations to reach underrepresented groups',
      'Use digital tools to engage audiences who cannot attend in person',
      'Measure audience diversity, not just headcounts'
    ]
  },

  // ─── Interreg Specific ───
  {
    id: 'ir-01',
    title: 'Interreg: Joint Communication is Mandatory',
    description: 'Interreg projects must demonstrate joint cross-border communication. All partners should contribute to a shared communication plan, not just publish in their own language.',
    programme: 'Interreg',
    domain: 'communication',
    phase: 'planning',
    tips: [
      'Create a joint communication plan signed by all partners',
      'Publish in all partner languages, not just English',
      'Use the Interreg brand guidelines consistently',
      'Showcase cross-border impact stories, not just national achievements'
    ]
  },

  // ─── Digital Europe Specific ───
  {
    id: 'de-01',
    title: 'Digital Europe: Focus on Deployment and Uptake',
    description: 'Digital Europe is about deployment, not research. Your CDE activities should demonstrate real-world adoption, user training, and scalability — not just awareness.',
    programme: 'Digital Europe',
    domain: 'exploitation',
    phase: 'execution',
    tips: [
      'Track number of organisations adopting or piloting your solution',
      'Document training sessions with participant counts and feedback',
      'Show scalability evidence — can your solution work at EU scale?',
      'Partner with Digital Innovation Hubs for broader deployment'
    ]
  },

  // ─── LIFE Programme Specific ───
  {
    id: 'li-01',
    title: 'LIFE: Demonstrate Environmental Impact',
    description: 'LIFE programme CDE must connect to measurable environmental outcomes. Show how your communication drives behavioural change and policy influence.',
    programme: 'LIFE',
    domain: 'communication',
    phase: 'reporting',
    tips: [
      'Link CDE activities to specific environmental indicators',
      'Document policy engagement — meetings, position papers, consultations',
      'Track behavioural change evidence in target communities',
      'Use before-and-after environmental data where possible'
    ]
  }
];

export const PROGRAMME_LIST = ['all', 'Horizon Europe', 'Erasmus+', 'Creative Europe', 'LIFE', 'Interreg', 'Digital Europe'];
export const DOMAIN_LIST = ['general', 'communication', 'dissemination', 'exploitation'] as const;
export const PHASE_LIST = ['all', 'planning', 'execution', 'reporting'] as const;

// ─── Template Application History ───

export interface TemplateApplication {
  id: string;
  templateId: string;
  templateName: string;
  templateCategory: string;
  projectId: string;
  appliedAt: string;
  itemsCreated: number;
}

export class TemplateApplicationStore {
  private key: string;

  constructor(projectId: string) {
    this.key = `cde_template_history_${projectId}`;
  }

  getAll(): TemplateApplication[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  add(entry: Omit<TemplateApplication, 'id' | 'appliedAt'>): TemplateApplication {
    const all = this.getAll();
    const newEntry: TemplateApplication = {
      ...entry,
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      appliedAt: new Date().toISOString()
    };
    all.unshift(newEntry);
    // Keep last 50
    const trimmed = all.slice(0, 50);
    localStorage.setItem(this.key, JSON.stringify(trimmed));
    return newEntry;
  }

  hasBeenApplied(templateId: string): boolean {
    return this.getAll().some(a => a.templateId === templateId);
  }

  getApplicationsForTemplate(templateId: string): TemplateApplication[] {
    return this.getAll().filter(a => a.templateId === templateId);
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}

// ─── Template Store (localStorage) ───
// Stores templates per-org in localStorage, avoiding DB schema issues.

export interface StoredTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  content_json: string;
  is_global: boolean;
  org_id: string;
  created_at: string;
  updated_at: string;
}

export class TemplateStore {
  private key: string;

  constructor(orgId: string) {
    this.key = `cde_templates_${orgId}`;
  }

  getAll(): StoredTemplate[] {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  add(template: Omit<StoredTemplate, 'id' | 'created_at' | 'updated_at'>): StoredTemplate {
    const all = this.getAll();
    const now = new Date().toISOString();
    const newTemplate: StoredTemplate = {
      ...template,
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: now,
      updated_at: now
    };
    all.unshift(newTemplate);
    localStorage.setItem(this.key, JSON.stringify(all));
    return newTemplate;
  }

  update(id: string, updates: Partial<Omit<StoredTemplate, 'id' | 'created_at'>>): StoredTemplate | null {
    const all = this.getAll();
    const index = all.findIndex(t => t.id === id);
    if (index === -1) return null;
    all[index] = { ...all[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(this.key, JSON.stringify(all));
    return all[index];
  }

  delete(id: string): boolean {
    const all = this.getAll();
    const filtered = all.filter(t => t.id !== id);
    if (filtered.length === all.length) return false;
    localStorage.setItem(this.key, JSON.stringify(filtered));
    return true;
  }

  getById(id: string): StoredTemplate | undefined {
    return this.getAll().find(t => t.id === id);
  }
}

// ─── Template Field Definitions ───

export interface TemplateFieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

export const TEMPLATE_FIELDS: Record<string, TemplateFieldDef[]> = {
  objective: [
    { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Raise awareness among policymakers' },
    { key: 'domain', label: 'Domain', type: 'select', required: true, options: [
      { value: 'communication', label: 'Communication' },
      { value: 'dissemination', label: 'Dissemination' },
      { value: 'exploitation', label: 'Exploitation' }
    ]},
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the objective...' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'draft', label: 'Draft' },
      { value: 'completed', label: 'Completed' }
    ]}
  ],
  stakeholder: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g., National research councils' },
    { key: 'role', label: 'Role', type: 'text', placeholder: 'e.g., Policy influencer' },
    { key: 'priority_score', label: 'Priority (1-10)', type: 'number', placeholder: '5' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe this stakeholder group...' }
  ],
  activity: [
    { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Project launch webinar' },
    { key: 'domain', label: 'Domain', type: 'select', required: true, options: [
      { value: 'communication', label: 'Communication' },
      { value: 'dissemination', label: 'Dissemination' },
      { value: 'exploitation', label: 'Exploitation' }
    ]},
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'planned', label: 'Planned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' }
    ]},
    { key: 'effort_hours', label: 'Effort (hours)', type: 'number', placeholder: '8' }
  ],
  indicator: [
    { key: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g., Website unique visitors' },
    { key: 'unit', label: 'Unit', type: 'text', required: true, placeholder: 'e.g., visitors, downloads, attendees' },
    { key: 'baseline', label: 'Baseline', type: 'number', placeholder: '0' },
    { key: 'target', label: 'Target', type: 'number', placeholder: '1000' }
  ],
  message: [
    { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., Key message for policymakers' },
    { key: 'body', label: 'Message Body', type: 'textarea', required: true, placeholder: 'The full message text...' },
    { key: 'domain', label: 'Domain', type: 'select', options: [
      { value: 'communication', label: 'Communication' },
      { value: 'dissemination', label: 'Dissemination' },
      { value: 'exploitation', label: 'Exploitation' }
    ]},
    { key: 'value_proposition', label: 'Value Proposition', type: 'textarea', placeholder: 'Why this matters to the audience...' }
  ],
  channel: [
    { key: 'name', label: 'Channel Name', type: 'text', required: true, placeholder: 'e.g., Project LinkedIn page' },
    { key: 'channel_type', label: 'Type', type: 'select', required: true, options: [
      { value: 'social_media', label: 'Social Media' },
      { value: 'website', label: 'Website' },
      { value: 'newsletter', label: 'Newsletter' },
      { value: 'event', label: 'Event' },
      { value: 'publication', label: 'Publication' },
      { value: 'webinar', label: 'Webinar' },
      { value: 'press', label: 'Press' },
      { value: 'other', label: 'Other' }
    ]},
    { key: 'cost_type', label: 'Cost Type', type: 'select', options: [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      { value: 'mixed', label: 'Mixed' }
    ]}
  ]
};
