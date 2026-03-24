/**
 * Static bundle catalog — hardcoded definitions so the UI works
 * even before the bundle tables are created in Supabase.
 *
 * When adding a bundle to a project, indicator IDs are resolved
 * from indicator_library by code. Only indicators that exist in
 * the DB will be added.
 */

import type { IndicatorBundle } from './indicatorLibraryService';

export interface StaticBundleDefinition {
  code: string;
  name: string;
  description: string;
  bundle_type: 'segment' | 'purpose' | 'domain' | 'maturity';
  icon: string;
  color: string;
  sort_order: number;
  indicator_codes: { code: string; is_required: boolean }[];
}

export const BUNDLE_CATALOG: StaticBundleDefinition[] = [
  // ===== SEGMENT BUNDLES =====
  {
    code: 'BUNDLE-SEG-POLICY',
    name: 'Policymaker Engagement Pack',
    description: 'Essential indicators for projects targeting policy influence and engagement with decision-makers.',
    bundle_type: 'segment',
    icon: '\u{1F3DB}\uFE0F',
    color: 'blue',
    sort_order: 1,
    indicator_codes: [
      { code: 'COM-REACH-03', is_required: false },
      { code: 'COM-PERC-02', is_required: false },
      { code: 'DIS-KNO-05', is_required: false },
      { code: 'EXP-POL-01', is_required: false },
      { code: 'EXP-POL-02', is_required: false },
      { code: 'EXP-POL-03', is_required: false },
      { code: 'COM-REACH-06', is_required: false },
    ],
  },
  {
    code: 'BUNDLE-SEG-RESEARCH',
    name: 'Research Community Pack',
    description: 'Track scientific dissemination through publications, open access, citations, and conference engagement.',
    bundle_type: 'segment',
    icon: '\u{1F52C}',
    color: 'purple',
    sort_order: 2,
    indicator_codes: [
      { code: 'DIS-KNO-01', is_required: false },
      { code: 'DIS-KNO-02', is_required: false },
      { code: 'DIS-KNO-04', is_required: false },
      { code: 'DIS-OUT-01', is_required: false },
      { code: 'DIS-OUT-02', is_required: false },
      { code: 'DIS-CAP-03', is_required: false },
      { code: 'DIS-KNO-07', is_required: false },
    ],
  },
  {
    code: 'BUNDLE-SEG-INDUSTRY',
    name: 'Industry Engagement Pack',
    description: 'Monitor commercial exploitation pathways including agreements, implementations, IP, and economic impact.',
    bundle_type: 'segment',
    icon: '\u{1F3ED}',
    color: 'amber',
    sort_order: 3,
    indicator_codes: [
      { code: 'EXP-INT-01', is_required: false },
      { code: 'EXP-INT-02', is_required: false },
      { code: 'EXP-IMP-01', is_required: false },
      { code: 'EXP-ECO-01', is_required: false },
      { code: 'EXP-ECO-02', is_required: false },
      { code: 'EXP-ECO-05', is_required: false },
      { code: 'EXP-SUS-03', is_required: false },
    ],
  },
  {
    code: 'BUNDLE-SEG-PUBLIC',
    name: 'Public Awareness Kit',
    description: 'Measure public reach and engagement through digital channels, multimedia, and multilingual content.',
    bundle_type: 'segment',
    icon: '\u{1F465}',
    color: 'green',
    sort_order: 4,
    indicator_codes: [
      { code: 'COM-REACH-01', is_required: false },
      { code: 'COM-REACH-02', is_required: false },
      { code: 'COM-ENG-01', is_required: false },
      { code: 'COM-ENG-05', is_required: false },
      { code: 'COM-MAT-01', is_required: false },
      { code: 'COM-MAT-02', is_required: false },
      { code: 'COM-DIG-03', is_required: false },
    ],
  },

  // ===== PURPOSE BUNDLES =====
  {
    code: 'BUNDLE-PUR-STARTER',
    name: 'Quick Start \u2013 Minimum Viable CDE',
    description: 'The essentials for any EU project. Cover all three CDE domains with minimal setup \u2014 perfect for getting started quickly.',
    bundle_type: 'purpose',
    icon: '\u{1F680}',
    color: 'emerald',
    sort_order: 5,
    indicator_codes: [
      { code: 'COM-REACH-01', is_required: true },
      { code: 'COM-REACH-02', is_required: true },
      { code: 'COM-ENG-01', is_required: true },
      { code: 'DIS-KNO-01', is_required: true },
      { code: 'DIS-TRA-01', is_required: true },
      { code: 'EXP-INT-01', is_required: true },
      { code: 'COM-MAT-01', is_required: true },
    ],
  },
  {
    code: 'BUNDLE-PUR-HORIZON',
    name: 'Horizon Europe Compliance Pack',
    description: 'Covers all mandatory reporting requirements for Horizon Europe projects including open access, exploitation agreements, and sustainability planning.',
    bundle_type: 'purpose',
    icon: '\u{1F1EA}\u{1F1FA}',
    color: 'blue',
    sort_order: 6,
    indicator_codes: [
      { code: 'COM-REACH-01', is_required: false },
      { code: 'COM-REACH-03', is_required: false },
      { code: 'DIS-KNO-01', is_required: false },
      { code: 'DIS-KNO-02', is_required: false },
      { code: 'DIS-KNO-03', is_required: false },
      { code: 'DIS-CAP-01', is_required: false },
      { code: 'EXP-INT-01', is_required: false },
      { code: 'EXP-INT-02', is_required: false },
      { code: 'EXP-IMP-01', is_required: false },
      { code: 'EXP-SUS-01', is_required: false },
    ],
  },
  {
    code: 'BUNDLE-PUR-IMPACT',
    name: 'Impact Assessment Kit',
    description: 'Measure real-world impact across knowledge uptake, behavior change, policy influence, and economic returns.',
    bundle_type: 'purpose',
    icon: '\u{1F4CA}',
    color: 'rose',
    sort_order: 7,
    indicator_codes: [
      { code: 'COM-PERC-01', is_required: false },
      { code: 'COM-PERC-02', is_required: false },
      { code: 'DIS-KNO-04', is_required: false },
      { code: 'DIS-TRA-02', is_required: false },
      { code: 'EXP-IMP-01', is_required: false },
      { code: 'EXP-IMP-02', is_required: false },
      { code: 'EXP-POL-01', is_required: false },
      { code: 'EXP-ECO-01', is_required: false },
      { code: 'EXP-ECO-04', is_required: false },
    ],
  },
  {
    code: 'BUNDLE-PUR-DIGITAL',
    name: 'Digital Engagement Suite',
    description: 'Comprehensive digital presence tracking covering website, social media, email, and video engagement.',
    bundle_type: 'purpose',
    icon: '\u{1F4BB}',
    color: 'cyan',
    sort_order: 8,
    indicator_codes: [
      { code: 'COM-REACH-01', is_required: false },
      { code: 'COM-REACH-02', is_required: false },
      { code: 'COM-REACH-04', is_required: false },
      { code: 'COM-ENG-01', is_required: false },
      { code: 'COM-ENG-02', is_required: false },
      { code: 'COM-ENG-04', is_required: false },
      { code: 'COM-ENG-05', is_required: false },
      { code: 'COM-DIG-01', is_required: false },
      { code: 'COM-DIG-02', is_required: false },
    ],
  },

  // ===== DOMAIN BUNDLES =====
  {
    code: 'BUNDLE-DOM-COMM',
    name: 'Communication Essentials',
    description: 'Core communication indicators covering reach, engagement, audience diversity, and content production.',
    bundle_type: 'domain',
    icon: '\u{1F4E2}',
    color: 'sky',
    sort_order: 9,
    indicator_codes: [
      { code: 'COM-REACH-01', is_required: false },
      { code: 'COM-REACH-02', is_required: false },
      { code: 'COM-REACH-03', is_required: false },
      { code: 'COM-ENG-01', is_required: false },
      { code: 'COM-ENG-02', is_required: false },
      { code: 'COM-AUD-01', is_required: false },
      { code: 'COM-MAT-01', is_required: false },
    ],
  },
  {
    code: 'BUNDLE-DOM-EXPLOIT',
    name: 'Exploitation Tracker',
    description: 'End-to-end exploitation tracking from initial interest through formal agreements to sustainability and economic impact.',
    bundle_type: 'domain',
    icon: '\u{1F3AF}',
    color: 'orange',
    sort_order: 10,
    indicator_codes: [
      { code: 'EXP-INT-01', is_required: false },
      { code: 'EXP-INT-02', is_required: false },
      { code: 'EXP-IMP-01', is_required: false },
      { code: 'EXP-POL-01', is_required: false },
      { code: 'EXP-ECO-01', is_required: false },
      { code: 'EXP-SUS-01', is_required: false },
      { code: 'EXP-SUS-02', is_required: false },
    ],
  },
];

/**
 * Convert a static bundle definition into the IndicatorBundle format
 * used by the BundlePicker component
 */
export function toIndicatorBundle(def: StaticBundleDefinition): IndicatorBundle {
  return {
    bundle_id: def.code, // use code as ID for static bundles
    code: def.code,
    name: def.name,
    description: def.description,
    bundle_type: def.bundle_type,
    icon: def.icon,
    color: def.color,
    sort_order: def.sort_order,
    is_system: true,
  };
}
