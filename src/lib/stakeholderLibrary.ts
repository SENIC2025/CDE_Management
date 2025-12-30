export type StakeholderCategory = 'policy' | 'market' | 'research' | 'society' | 'media' | 'funders';
export type StakeholderLevel = 'EU' | 'national' | 'regional' | 'local';
export type EngagementLevel = 'awareness' | 'feedback' | 'co_creation' | 'uptake' | 'policy_reference';

export interface StakeholderArchetype {
  code: string;
  title: string;
  description: string;
  category: StakeholderCategory;
  defaultLevel: StakeholderLevel;
  defaultCDE: {
    communication: boolean;
    dissemination: boolean;
    exploitation: boolean;
  };
  suggestedEngagement: EngagementLevel;
  suggestedChannels: string[];
}

export const STAKEHOLDER_ARCHETYPES: StakeholderArchetype[] = [
  {
    code: 'STK-POL-01',
    title: 'Policymakers – EU level',
    description: 'EU Commission, Parliament, agencies involved in policy development and regulation',
    category: 'policy',
    defaultLevel: 'EU',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'policy_reference',
    suggestedChannels: ['policy_briefs', 'webinars', 'conferences', 'workshops']
  },
  {
    code: 'STK-POL-02',
    title: 'Policymakers – National level',
    description: 'National ministries, government departments, regulatory bodies',
    category: 'policy',
    defaultLevel: 'national',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'policy_reference',
    suggestedChannels: ['policy_briefs', 'workshops', 'stakeholder_events']
  },
  {
    code: 'STK-POL-03',
    title: 'Policymakers – Regional/Local level',
    description: 'Regional authorities, municipal governments, local decision-makers',
    category: 'policy',
    defaultLevel: 'regional',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'uptake',
    suggestedChannels: ['workshops', 'demos', 'local_events']
  },
  {
    code: 'STK-POL-04',
    title: 'Public Authorities & Agencies',
    description: 'National agencies, regulatory bodies, public service organizations',
    category: 'policy',
    defaultLevel: 'national',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'uptake',
    suggestedChannels: ['workshops', 'training', 'webinars']
  },
  {
    code: 'STK-MKT-01',
    title: 'Industry & SMEs',
    description: 'Private sector companies, SMEs, business associations interested in innovation adoption',
    category: 'market',
    defaultLevel: 'national',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'uptake',
    suggestedChannels: ['demos', 'workshops', 'business_events', 'linkedin']
  },
  {
    code: 'STK-MKT-02',
    title: 'Practitioners & Service Providers',
    description: 'Professionals who deliver services, field experts, operational staff',
    category: 'market',
    defaultLevel: 'regional',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'uptake',
    suggestedChannels: ['training', 'demos', 'workshops', 'user_communities']
  },
  {
    code: 'STK-MKT-03',
    title: 'Social Economy Organisations',
    description: 'Cooperatives, social enterprises, community-led initiatives',
    category: 'market',
    defaultLevel: 'regional',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'co_creation',
    suggestedChannels: ['workshops', 'community_events', 'newsletters']
  },
  {
    code: 'STK-RES-01',
    title: 'Researchers & Academia',
    description: 'Universities, research institutions, PhD students, academic networks',
    category: 'research',
    defaultLevel: 'EU',
    defaultCDE: { communication: true, dissemination: true, exploitation: false },
    suggestedEngagement: 'co_creation',
    suggestedChannels: ['publications', 'conferences', 'webinars', 'research_networks']
  },
  {
    code: 'STK-RES-02',
    title: 'Research Networks & Platforms',
    description: 'Thematic networks, research infrastructures, collaborative platforms',
    category: 'research',
    defaultLevel: 'EU',
    defaultCDE: { communication: true, dissemination: true, exploitation: false },
    suggestedEngagement: 'feedback',
    suggestedChannels: ['newsletters', 'webinars', 'online_platforms']
  },
  {
    code: 'STK-EDU-01',
    title: 'Education & Training Providers',
    description: 'Schools, vocational training centers, lifelong learning institutions',
    category: 'society',
    defaultLevel: 'regional',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'uptake',
    suggestedChannels: ['training', 'workshops', 'educational_materials']
  },
  {
    code: 'STK-SOC-01',
    title: 'NGOs & Civil Society',
    description: 'Non-profits, advocacy groups, community organizations',
    category: 'society',
    defaultLevel: 'national',
    defaultCDE: { communication: true, dissemination: true, exploitation: false },
    suggestedEngagement: 'feedback',
    suggestedChannels: ['stakeholder_events', 'newsletters', 'social_media']
  },
  {
    code: 'STK-SOC-02',
    title: 'End Users & Citizens',
    description: 'Direct beneficiaries, general public, consumer groups',
    category: 'society',
    defaultLevel: 'local',
    defaultCDE: { communication: true, dissemination: false, exploitation: true },
    suggestedEngagement: 'awareness',
    suggestedChannels: ['social_media', 'public_events', 'media', 'website']
  },
  {
    code: 'STK-SOC-03',
    title: 'Local Communities',
    description: 'Neighborhood groups, local associations, community representatives',
    category: 'society',
    defaultLevel: 'local',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'co_creation',
    suggestedChannels: ['community_events', 'workshops', 'local_media']
  },
  {
    code: 'STK-MED-01',
    title: 'Media & Journalists',
    description: 'Press, journalists, media outlets, science communicators',
    category: 'media',
    defaultLevel: 'national',
    defaultCDE: { communication: true, dissemination: false, exploitation: false },
    suggestedEngagement: 'awareness',
    suggestedChannels: ['press_releases', 'media_events', 'interviews']
  },
  {
    code: 'STK-MED-02',
    title: 'Multipliers & Influencers',
    description: 'Opinion leaders, bloggers, social media influencers, ambassadors',
    category: 'media',
    defaultLevel: 'national',
    defaultCDE: { communication: true, dissemination: true, exploitation: false },
    suggestedEngagement: 'feedback',
    suggestedChannels: ['social_media', 'blogs', 'influencer_partnerships']
  },
  {
    code: 'STK-FUN-01',
    title: 'Funders & Investors',
    description: 'EU programmes, national funding agencies, venture capital, impact investors',
    category: 'funders',
    defaultLevel: 'EU',
    defaultCDE: { communication: true, dissemination: false, exploitation: true },
    suggestedEngagement: 'awareness',
    suggestedChannels: ['reports', 'presentations', 'investor_events']
  },
  {
    code: 'STK-STD-01',
    title: 'Standards & Certification Bodies',
    description: 'Standardization organizations, certification authorities, quality assurance bodies',
    category: 'policy',
    defaultLevel: 'EU',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'policy_reference',
    suggestedChannels: ['technical_committees', 'working_groups', 'reports']
  },
  {
    code: 'STK-NET-01',
    title: 'Professional Networks & Associations',
    description: 'Industry associations, professional bodies, trade organizations',
    category: 'market',
    defaultLevel: 'national',
    defaultCDE: { communication: true, dissemination: true, exploitation: false },
    suggestedEngagement: 'feedback',
    suggestedChannels: ['conferences', 'newsletters', 'member_events']
  },
  {
    code: 'STK-NET-02',
    title: 'Innovation Ecosystems & Clusters',
    description: 'Innovation hubs, clusters, technology parks, accelerators',
    category: 'market',
    defaultLevel: 'regional',
    defaultCDE: { communication: true, dissemination: true, exploitation: true },
    suggestedEngagement: 'co_creation',
    suggestedChannels: ['ecosystem_events', 'workshops', 'innovation_showcases']
  },
  {
    code: 'STK-INT-01',
    title: 'International Partners',
    description: 'International organizations, global networks, partner countries',
    category: 'policy',
    defaultLevel: 'EU',
    defaultCDE: { communication: true, dissemination: true, exploitation: false },
    suggestedEngagement: 'feedback',
    suggestedChannels: ['international_conferences', 'bilateral_meetings', 'reports']
  }
];

export function filterByCategory(archetypes: StakeholderArchetype[], category: StakeholderCategory | 'all'): StakeholderArchetype[] {
  if (category === 'all') return archetypes;
  return archetypes.filter(a => a.category === category);
}

export function filterByLevel(archetypes: StakeholderArchetype[], level: StakeholderLevel | 'all'): StakeholderArchetype[] {
  if (level === 'all') return archetypes;
  return archetypes.filter(a => a.defaultLevel === level);
}

export function filterByCDE(archetypes: StakeholderArchetype[], cde: 'communication' | 'dissemination' | 'exploitation' | null): StakeholderArchetype[] {
  if (!cde) return archetypes;
  return archetypes.filter(a => a.defaultCDE[cde]);
}

export function searchByText(archetypes: StakeholderArchetype[], searchTerm: string): StakeholderArchetype[] {
  if (!searchTerm.trim()) return archetypes;
  const lower = searchTerm.toLowerCase();
  return archetypes.filter(a =>
    a.title.toLowerCase().includes(lower) ||
    a.description.toLowerCase().includes(lower) ||
    a.category.toLowerCase().includes(lower)
  );
}

export function getCategoryLabel(category: StakeholderCategory): string {
  const labels: Record<StakeholderCategory, string> = {
    policy: 'Policy',
    market: 'Market',
    research: 'Research',
    society: 'Society',
    media: 'Media',
    funders: 'Funders'
  };
  return labels[category];
}

export function getCategoryColor(category: StakeholderCategory): string {
  const colors: Record<StakeholderCategory, string> = {
    policy: 'bg-blue-100 text-blue-700',
    market: 'bg-green-100 text-green-700',
    research: 'bg-purple-100 text-purple-700',
    society: 'bg-orange-100 text-orange-700',
    media: 'bg-pink-100 text-pink-700',
    funders: 'bg-yellow-100 text-yellow-700'
  };
  return colors[category];
}

export function getEngagementLabel(engagement: EngagementLevel): string {
  const labels: Record<EngagementLevel, string> = {
    awareness: 'Awareness only',
    feedback: 'Feedback',
    co_creation: 'Co-creation',
    uptake: 'Uptake/adoption',
    policy_reference: 'Policy reference'
  };
  return labels[engagement];
}

export function getEngagementColor(engagement: EngagementLevel): string {
  const colors: Record<EngagementLevel, string> = {
    awareness: 'bg-gray-100 text-gray-700',
    feedback: 'bg-blue-100 text-blue-700',
    co_creation: 'bg-green-100 text-green-700',
    uptake: 'bg-amber-100 text-amber-700',
    policy_reference: 'bg-red-100 text-red-700'
  };
  return colors[engagement];
}
