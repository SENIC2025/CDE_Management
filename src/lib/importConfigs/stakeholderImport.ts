// ── Stakeholder Import Config ────────────────────────────────────────────────
// Field definitions, validation, and insert logic for importing stakeholders
// from CSV/Excel files into the stakeholder_groups table.

import { supabase } from '../supabase';
import type { ImportConfig } from '../importEngine';

export const STAKEHOLDER_IMPORT_CONFIG: ImportConfig = {
  entityName: 'Stakeholder',
  entityNamePlural: 'Stakeholders',
  maxRows: 500,
  templateFileName: 'stakeholder_import_template.csv',

  fields: [
    {
      key: 'name',
      label: 'Name',
      required: true,
      type: 'text',
      synonyms: [
        'name', 'stakeholder', 'stakeholder name', 'stakeholder group',
        'organisation', 'organization', 'company', 'group', 'partner',
        'contact', 'entity', 'institution', 'agency', 'body',
      ],
    },
    {
      key: 'description',
      label: 'Description',
      required: false,
      type: 'text',
      synonyms: [
        'description', 'notes', 'details', 'about', 'info',
        'comment', 'comments', 'remarks', 'summary',
      ],
    },
    {
      key: 'role',
      label: 'Category',
      required: false,
      type: 'select',
      options: [
        { value: 'policy', label: 'Policy & Government' },
        { value: 'market', label: 'Industry & Market' },
        { value: 'research', label: 'Research & Academia' },
        { value: 'society', label: 'Civil Society' },
        { value: 'media', label: 'Media' },
        { value: 'funders', label: 'Funders & Investors' },
      ],
      synonyms: [
        'category', 'role', 'type', 'sector', 'group type',
        'stakeholder type', 'classification', 'class',
      ],
      defaultValue: 'society',
      transform: (raw: string) => {
        const lower = raw.toLowerCase().trim();
        if (['policy', 'government', 'public', 'regulator', 'ministry', 'authority', 'parliament'].some(s => lower.includes(s))) return 'policy';
        if (['market', 'industry', 'business', 'sme', 'company', 'enterprise', 'corporate', 'private'].some(s => lower.includes(s))) return 'market';
        if (['research', 'academic', 'university', 'scientist', 'institute', 'lab', 'professor'].some(s => lower.includes(s))) return 'research';
        if (['media', 'journalist', 'press', 'broadcaster', 'news'].some(s => lower.includes(s))) return 'media';
        if (['fund', 'invest', 'donor', 'grant', 'financ', 'bank', 'vc', 'venture'].some(s => lower.includes(s))) return 'funders';
        if (['society', 'civil', 'ngo', 'citizen', 'community', 'association', 'charity', 'foundation'].some(s => lower.includes(s))) return 'society';
        return 'society'; // sensible default
      },
    },
    {
      key: 'level',
      label: 'Level',
      required: false,
      type: 'select',
      options: [
        { value: 'EU', label: 'EU' },
        { value: 'national', label: 'National' },
        { value: 'regional', label: 'Regional' },
        { value: 'local', label: 'Local' },
      ],
      synonyms: [
        'level', 'geographic', 'scope', 'geography', 'reach',
        'geographic level', 'geo', 'scale',
      ],
      defaultValue: 'national',
      transform: (raw: string) => {
        const lower = raw.toLowerCase().trim();
        if (['eu', 'europe', 'european', 'international', 'global', 'worldwide'].some(s => lower.includes(s))) return 'EU';
        if (['regional', 'region', 'state', 'province'].some(s => lower.includes(s))) return 'regional';
        if (['local', 'city', 'municipal', 'town', 'district'].some(s => lower.includes(s))) return 'local';
        return 'national';
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      required: false,
      type: 'select',
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'observational', label: 'Observational' },
      ],
      synonyms: [
        'priority', 'importance', 'rank', 'tier', 'weight',
        'relevance', 'priority level',
      ],
      defaultValue: 'secondary',
      transform: (raw: string) => {
        const lower = raw.toLowerCase().trim();
        if (['primary', 'high', 'key', 'critical', '1', 'main', 'core', 'essential', 'top'].some(s => lower.includes(s))) return 'primary';
        if (['low', 'minor', 'observ', '3', 'tertiary', 'peripheral', 'marginal'].some(s => lower.includes(s))) return 'observational';
        return 'secondary';
      },
    },
  ],

  // ── Validation ──────────────────────────────────────────────────────────
  validateRow: (row: Record<string, string>) => {
    const errors: string[] = [];
    if (!row.name?.trim()) {
      errors.push('Name is required');
    } else if (row.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (row.name.trim().length > 200) {
      errors.push('Name must be 200 characters or less');
    }
    return errors;
  },

  // ── Duplicate Detection ─────────────────────────────────────────────────
  checkDuplicate: async (row: Record<string, string>, projectId: string) => {
    const { data } = await supabase
      .from('stakeholder_groups')
      .select('id')
      .eq('project_id', projectId)
      .ilike('name', row.name.trim())
      .maybeSingle();
    return !!data;
  },

  // ── Insert ──────────────────────────────────────────────────────────────
  insertRow: async (row: Record<string, string>, projectId: string) => {
    const priorityMap: Record<string, number> = {
      primary: 10,
      secondary: 7,
      observational: 4,
    };

    const metadata = {
      cde: { communication: true, dissemination: false, exploitation: false },
      engagement: 'awareness',
      libraryCode: null,
    };

    const { error } = await supabase.from('stakeholder_groups').insert({
      project_id: projectId,
      name: row.name.trim(),
      description: row.description?.trim() || '',
      role: row.role || 'society',
      level: row.level || 'national',
      priority_score: priorityMap[row.priority || 'secondary'] || 7,
      capacity_to_act: '[METADATA]' + JSON.stringify(metadata),
    });

    if (error) throw new Error(error.message);
  },
};
