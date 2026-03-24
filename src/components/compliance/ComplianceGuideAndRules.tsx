import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Shield,
  Target,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Zap,
  Package,
  Gauge,
  ArrowRight,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  X,
  Globe,
  Building2,
  FolderOpen,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Search,
  Printer,
  CheckSquare
} from 'lucide-react';
import {
  getModuleRoute,
  EU_PROGRAMMES,
  ComplianceProgrammeStore,
  CustomRulesStore
} from '../../lib/complianceMetadata';
import type { ProgrammeProfile, CustomRule } from '../../lib/complianceMetadata';
import { ConfirmDialog } from '../ui';
import useConfirm from '../../hooks/useConfirm';

interface ComplianceGuideAndRulesProps {
  projectId: string;
  orgId: string;
  rules: any[];  // System rules from compliance_rules table
  userId?: string;
}

type Section = 'methodology' | 'programme' | 'rules' | 'custom';

// Module guide data
const MODULE_GUIDES = [
  {
    key: 'objectives',
    label: 'CDE Objectives',
    icon: <Target className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-100',
    euExpects: 'Every EU-funded project must define clear, measurable objectives for Communication, Dissemination, and Exploitation. Objectives should cover all three CDE domains and include quantifiable KPIs.',
    minimumRequirements: [
      'At least 1 objective per CDE domain (Communication, Dissemination, Exploitation)',
      'Each objective should have at least 1 linked KPI or indicator',
      'Objectives should have assigned owners'
    ],
    commonGaps: [
      'Missing exploitation objectives entirely',
      'Objectives without measurable KPIs',
      'No distinction between communication and dissemination goals'
    ]
  },
  {
    key: 'stakeholders',
    label: 'Stakeholder Management',
    icon: <Users className="h-5 w-5" />,
    color: 'text-green-600 bg-green-100',
    euExpects: 'Projects must identify, analyse, and actively engage relevant stakeholder groups. The stakeholder map should cover policy makers, industry, academia, civil society, and end users as appropriate.',
    minimumRequirements: [
      'At least 3 stakeholder groups defined',
      'Each group should have a profile with engagement level',
      'Stakeholder groups should be linked to activities and messages'
    ],
    commonGaps: [
      'Missing key stakeholder categories (e.g., policy makers)',
      'No stakeholder engagement strategy documented',
      'Activities not linked to specific stakeholder groups'
    ]
  },
  {
    key: 'messages',
    label: 'Messages & Value Propositions',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'text-purple-600 bg-purple-100',
    euExpects: 'Clear, audience-specific messages must be developed for each stakeholder group. Messages should align with project objectives and be tailored for different communication channels.',
    minimumRequirements: [
      'At least 1 message per active stakeholder group',
      'Messages linked to objectives and stakeholder groups',
      'Clear value propositions for key audiences'
    ],
    commonGaps: [
      'Generic messages not tailored to audiences',
      'No messages targeting policy or industry stakeholders',
      'Messages not linked to project objectives'
    ]
  },
  {
    key: 'activities',
    label: 'CDE Activities',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'text-orange-600 bg-orange-100',
    euExpects: 'A comprehensive plan of CDE activities across the project lifecycle. Activities should use appropriate channels, target specific stakeholders, and have assigned effort/resources.',
    minimumRequirements: [
      'At least 1 activity planned per reporting period',
      'Each activity linked to a channel and stakeholder group',
      'Effort hours and responsible persons assigned'
    ],
    commonGaps: [
      'Activities clustered at project end instead of spread across timeline',
      'No exploitation-focused activities planned',
      'Missing evidence for completed activities'
    ]
  },
  {
    key: 'channels',
    label: 'Channel Catalogue',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-yellow-600 bg-yellow-100',
    euExpects: 'Projects should maintain a catalogue of communication and dissemination channels appropriate for their audiences. Channel selection should be justified and cost-effective.',
    minimumRequirements: [
      'At least 2 channels configured',
      'Channel types covering both digital and in-person',
      'Cost metadata for budget reporting'
    ],
    commonGaps: [
      'Only social media channels, missing events/publications',
      'No cost tracking for channel effectiveness analysis',
      'Channels not matched to stakeholder preferences'
    ]
  },
  {
    key: 'indicators',
    label: 'Monitoring & Indicators',
    icon: <Gauge className="h-5 w-5" />,
    color: 'text-cyan-600 bg-cyan-100',
    euExpects: 'Measurable indicators must track CDE progress and impact. Both quantitative (reach, downloads, citations) and qualitative (stakeholder feedback, policy uptake) indicators are expected.',
    minimumRequirements: [
      'At least 1 indicator per objective',
      'Target values set for each indicator',
      'Regular measurement and recording of results'
    ],
    commonGaps: [
      'Indicators without baseline or target values',
      'No qualitative indicators',
      'Results not regularly recorded'
    ]
  },
  {
    key: 'evidence',
    label: 'Evidence & Documentation',
    icon: <FileText className="h-5 w-5" />,
    color: 'text-slate-600 bg-slate-100',
    euExpects: 'All CDE activities must be documented with auditable evidence. This includes screenshots, analytics reports, event attendance records, publication copies, and stakeholder feedback.',
    minimumRequirements: [
      'Evidence uploaded for completed activities',
      'Evidence linked to specific activities or indicator claims',
      'File metadata (date, type, description) captured'
    ],
    commonGaps: [
      'Activities marked complete without evidence',
      'Evidence not linked to specific claims or activities',
      'Missing event documentation (photos, attendance lists)'
    ]
  },
  {
    key: 'exploitation',
    label: 'Exploitation & Uptake',
    icon: <Package className="h-5 w-5" />,
    color: 'text-indigo-600 bg-indigo-100',
    euExpects: 'Projects must demonstrate a clear strategy for exploiting results beyond the project lifetime. This includes identifying exploitable results, potential users, IP considerations, and uptake pathways.',
    minimumRequirements: [
      'At least 1 exploitable result identified',
      'Exploitation type categorised (commercial, policy, academic, etc.)',
      'Results moving through exploitation pipeline stages'
    ],
    commonGaps: [
      'No exploitation strategy defined',
      'Results identified but no uptake pathway planned',
      'Missing IP or licensing considerations'
    ]
  },
  {
    key: 'strategy',
    label: 'CDE Strategy',
    icon: <BookOpen className="h-5 w-5" />,
    color: 'text-rose-600 bg-rose-100',
    euExpects: 'A documented CDE strategy that aligns with the Description of Action. The strategy should define goals, target audiences, key messages, channels, timeline, and evaluation approach.',
    minimumRequirements: [
      'Strategy document created and maintained',
      'Clear goals aligned with project objectives',
      'Timeline with milestones for CDE activities'
    ],
    commonGaps: [
      'Strategy written at start but never updated',
      'No link between strategy goals and operational activities',
      'Missing evaluation methodology'
    ]
  }
];

const SEVERITY_GUIDE = [
  {
    level: 'critical',
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500',
    label: 'Critical',
    meaning: 'Audit risk — this gap could trigger findings in an EU audit or review. Immediate action required.',
    examples: 'No CDE strategy defined, zero evidence uploaded, no stakeholders identified'
  },
  {
    level: 'high',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
    label: 'High',
    meaning: 'Reporting gap — this will likely be flagged in periodic or final reports. Address within this reporting period.',
    examples: 'Missing exploitation plan, activities without evidence, indicators without targets'
  },
  {
    level: 'medium',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    dotColor: 'bg-yellow-500',
    label: 'Medium',
    meaning: 'Best practice gap — not meeting recommended practices. Address in the next cycle.',
    examples: 'Few stakeholder groups, messages not linked to objectives, limited channel diversity'
  },
  {
    level: 'low',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    dotColor: 'bg-slate-400',
    label: 'Low',
    meaning: 'Enhancement opportunity — your project would benefit from this but it is not a compliance requirement.',
    examples: 'No qualitative indicators, missing cost metadata on channels, strategy not recently updated'
  }
];

export default function ComplianceGuideAndRules({
  projectId,
  orgId,
  rules,
  userId
}: ComplianceGuideAndRulesProps) {
  const navigate = useNavigate();
  const [confirmProps, confirmDialog] = useConfirm();

  // Section collapse state
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['methodology', 'programme', 'rules']));
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Programme profile
  const [selectedProgramme, setSelectedProgramme] = useState(
    () => ComplianceProgrammeStore.getSelectedProgramme(projectId)
  );

  // Custom rules
  const [customRules, setCustomRules] = useState<CustomRule[]>(
    () => CustomRulesStore.getAllCustomRules(orgId, projectId)
  );
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);

  // Custom rule form
  const [ruleForm, setRuleForm] = useState({
    code: '',
    title: '',
    description: '',
    severity: 'medium' as CustomRule['severity'],
    module: 'objectives',
    passCriteria: '',
    scope: 'project' as CustomRule['scope']
  });

  const currentProgramme = useMemo(
    () => EU_PROGRAMMES.find(p => p.id === selectedProgramme) || EU_PROGRAMMES[0],
    [selectedProgramme]
  );

  // Filter system rules by programme profile
  const filteredSystemRules = useMemo(() => {
    const scopes = new Set(currentProgramme.ruleScopes);
    return rules.filter(r => scopes.has(r.programme_profile || 'Common'));
  }, [rules, currentProgramme]);

  // Search filter
  const searchFilteredRules = useMemo(() => {
    if (!searchTerm) return filteredSystemRules;
    const term = searchTerm.toLowerCase();
    return filteredSystemRules.filter(r =>
      (r.title || '').toLowerCase().includes(term) ||
      (r.code || '').toLowerCase().includes(term) ||
      (r.description || '').toLowerCase().includes(term) ||
      (r.scope || '').toLowerCase().includes(term)
    );
  }, [filteredSystemRules, searchTerm]);

  // Group rules by scope/category
  const rulesByCategory = useMemo(() => {
    return searchFilteredRules.reduce((acc: Record<string, any[]>, rule) => {
      const category = rule.scope || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(rule);
      return acc;
    }, {});
  }, [searchFilteredRules]);

  function toggleSection(section: Section) {
    const next = new Set(openSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setOpenSections(next);
  }

  function handleProgrammeChange(programmeId: string) {
    setSelectedProgramme(programmeId);
    ComplianceProgrammeStore.setSelectedProgramme(projectId, programmeId);
  }

  function resetRuleForm() {
    setRuleForm({
      code: '',
      title: '',
      description: '',
      severity: 'medium',
      module: 'objectives',
      passCriteria: '',
      scope: 'project'
    });
    setShowCreateRule(false);
    setEditingRule(null);
  }

  function handleSaveCustomRule() {
    if (!ruleForm.code.trim() || !ruleForm.title.trim()) return;

    if (editingRule) {
      CustomRulesStore.updateRule(orgId, projectId, editingRule.id, {
        code: ruleForm.code,
        title: ruleForm.title,
        description: ruleForm.description,
        severity: ruleForm.severity,
        module: ruleForm.module,
        passCriteria: ruleForm.passCriteria,
        scope: ruleForm.scope
      });
    } else {
      CustomRulesStore.addRule(orgId, projectId, {
        code: ruleForm.code,
        title: ruleForm.title,
        description: ruleForm.description,
        severity: ruleForm.severity,
        module: ruleForm.module,
        passCriteria: ruleForm.passCriteria,
        active: true,
        scope: ruleForm.scope,
        createdBy: userId
      });
    }

    setCustomRules(CustomRulesStore.getAllCustomRules(orgId, projectId));
    resetRuleForm();
  }

  function handleEditRule(rule: CustomRule) {
    setRuleForm({
      code: rule.code,
      title: rule.title,
      description: rule.description,
      severity: rule.severity,
      module: rule.module,
      passCriteria: rule.passCriteria,
      scope: rule.scope
    });
    setEditingRule(rule);
    setShowCreateRule(true);
  }

  function handleToggleRule(rule: CustomRule) {
    CustomRulesStore.updateRule(orgId, projectId, rule.id, { active: !rule.active });
    setCustomRules(CustomRulesStore.getAllCustomRules(orgId, projectId));
  }

  async function handleDeleteRule(rule: CustomRule) {
    const ok = await confirmDialog({ title: 'Delete custom rule?', message: `"${rule.code}: ${rule.title}" will be permanently removed.` });
    if (!ok) return;
    CustomRulesStore.deleteRule(orgId, projectId, rule.id);
    setCustomRules(CustomRulesStore.getAllCustomRules(orgId, projectId));
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-slate-100 text-slate-600'
  };

  // Section header component
  function SectionHeader({ section, title, subtitle, icon }: {
    section: Section; title: string; subtitle: string; icon: React.ReactNode
  }) {
    const isOpen = openSections.has(section);
    return (
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between p-5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {isOpen
          ? <ChevronUp className="h-5 w-5 text-slate-400" />
          : <ChevronDown className="h-5 w-5 text-slate-400" />
        }
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* ───── SECTION 1: METHODOLOGY ───── */}
      <SectionHeader
        section="methodology"
        title="Methodology"
        subtitle="How the compliance engine works, what it checks, and how scores are calculated"
        icon={<BookOpen className="h-5 w-5" />}
      />
      {openSections.has('methodology') && (
        <div className="space-y-4 pl-2">
          {/* How it works */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              How the Compliance Engine Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="text-3xl font-bold text-blue-600 mb-1">1</div>
                <div className="font-medium text-slate-900 mb-1">Data Collection</div>
                <div className="text-sm text-slate-600">
                  The engine queries your actual project data across 9 modules: objectives, stakeholders, messages, activities, channels, indicators, evidence, exploitation, and strategy.
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="text-3xl font-bold text-blue-600 mb-1">2</div>
                <div className="font-medium text-slate-900 mb-1">Rule Evaluation</div>
                <div className="text-sm text-slate-600">
                  Each compliance rule is evaluated against your data. Rules check for minimum counts, required links between entities, completeness of fields, and alignment with EU programme requirements.
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="text-3xl font-bold text-blue-600 mb-1">3</div>
                <div className="font-medium text-slate-900 mb-1">Scoring & Reporting</div>
                <div className="text-sm text-slate-600">
                  Results are aggregated into a compliance score (0-100%), broken down by module and severity. Failed rules become actionable issues with remediation suggestions.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600">
                  <strong>Scoring formula:</strong> Compliance Score = (Rules Passed / Total Applicable Rules) x 100%.
                  Rules are weighted equally — a critical-severity failure counts the same as a low-severity one in the percentage.
                  However, the dashboard highlights severity to help you prioritise what matters most.
                </div>
              </div>
            </div>
          </div>

          {/* Severity Guide */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Severity Levels Explained
            </h3>
            <div className="space-y-3">
              {SEVERITY_GUIDE.map(sev => (
                <div key={sev.level} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                  <div className={`w-3 h-3 rounded-full ${sev.dotColor} flex-shrink-0 mt-1.5`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${sev.color}`}>
                        {sev.label}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">{sev.meaning}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      <strong>Examples:</strong> {sev.examples}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Module Guide */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Module-by-Module Compliance Guide
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Click any module to see what the EU expects, minimum requirements to pass, and common gaps we detect.
            </p>
            <div className="space-y-2">
              {MODULE_GUIDES.map(mod => {
                const isExpanded = expandedModule === mod.key;
                return (
                  <div key={mod.key} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${mod.color}`}>
                          {mod.icon}
                        </div>
                        <span className="font-medium text-slate-900">{mod.label}</span>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-slate-400" />
                        : <ChevronDown className="h-4 w-4 text-slate-400" />
                      }
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                            What the EU Expects
                          </div>
                          <div className="text-sm text-slate-700">{mod.euExpects}</div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">
                            Minimum Requirements to Pass
                          </div>
                          <ul className="space-y-1">
                            {mod.minimumRequirements.map((req, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">
                            Common Gaps We Detect
                          </div>
                          <ul className="space-y-1">
                            {mod.commonGaps.map((gap, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                                {gap}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={() => navigate(getModuleRoute(mod.key))}
                          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Open {mod.label} module
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compliance Checklist */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-indigo-600" />
                Compliance Readiness Checklist
              </h3>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Complete these steps to achieve full compliance. This checklist covers the essential requirements common across EU programmes.
            </p>
            <div className="space-y-2">
              {[
                { step: 1, action: 'Define CDE objectives covering Communication, Dissemination, and Exploitation', module: 'objectives' },
                { step: 2, action: 'Create your CDE strategy document with goals, timeline, and evaluation approach', module: 'strategy' },
                { step: 3, action: 'Identify at least 3 stakeholder groups with engagement profiles', module: 'stakeholders' },
                { step: 4, action: 'Develop audience-specific messages linked to objectives and stakeholders', module: 'messages' },
                { step: 5, action: 'Set up your channel catalogue with at least 2 channel types', module: 'channels' },
                { step: 6, action: 'Plan CDE activities across the project timeline with effort allocation', module: 'activities' },
                { step: 7, action: 'Define monitoring indicators with measurable targets for each objective', module: 'indicators' },
                { step: 8, action: 'Upload evidence for all completed activities', module: 'evidence' },
                { step: 9, action: 'Identify exploitable results and set up your exploitation pipeline', module: 'exploitation' },
                { step: 10, action: 'Run a compliance check and address any critical or high-severity issues', module: 'compliance' }
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center justify-center h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1 text-sm text-slate-700 pt-0.5">{item.action}</div>
                  <button
                    onClick={() => navigate(getModuleRoute(item.module))}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                  >
                    Go <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───── SECTION 2: PROGRAMME PROFILE ───── */}
      <SectionHeader
        section="programme"
        title="Programme Profile"
        subtitle="Select your EU programme to filter rules — only relevant requirements will be checked"
        icon={<Globe className="h-5 w-5" />}
      />
      {openSections.has('programme') && (
        <div className="pl-2">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {EU_PROGRAMMES.map(programme => {
                const isSelected = selectedProgramme === programme.id;
                return (
                  <button
                    key={programme.id}
                    onClick={() => handleProgrammeChange(programme.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {programme.shortName}
                      </span>
                      {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
                    </div>
                    <div className={`font-medium mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                      {programme.name}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2">{programme.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-blue-900">
                    Active: {currentProgramme.name}
                  </div>
                  <div className="text-xs text-blue-700 mt-0.5">
                    Checking against: {currentProgramme.ruleScopes.join(', ')} rules
                    ({filteredSystemRules.length} rules applicable)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── SECTION 3: ACTIVE RULES ───── */}
      <SectionHeader
        section="rules"
        title="Active Rules"
        subtitle={`${filteredSystemRules.length} rules for ${currentProgramme.name}${customRules.filter(r => r.active).length > 0 ? ` + ${customRules.filter(r => r.active).length} custom` : ''}`}
        icon={<Shield className="h-5 w-5" />}
      />
      {openSections.has('rules') && (
        <div className="space-y-3 pl-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search rules by title, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {/* System Rules by Category */}
          {Object.entries(rulesByCategory).map(([category, categoryRules]) => (
            <div key={category} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">{category}</h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {categoryRules.length} {categoryRules.length === 1 ? 'rule' : 'rules'}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {categoryRules.map((rule: any) => (
                  <div key={rule.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityColors[rule.severity]}`}>
                            {rule.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                            {rule.programme_profile}
                          </span>
                          {rule.applies_to && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                              {rule.applies_to}
                            </span>
                          )}
                        </div>
                        <div className="font-medium text-slate-900 mb-0.5">{rule.title}</div>
                        <div className="text-xs text-slate-500 font-mono mb-1">{rule.code}</div>
                        {rule.description && (
                          <div className="text-sm text-slate-600">{rule.description}</div>
                        )}
                      </div>
                      {rule.applies_to && (
                        <button
                          onClick={() => navigate(getModuleRoute(rule.applies_to))}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                          title={`Go to ${rule.applies_to}`}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {searchFilteredRules.length === 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <div className="text-sm text-slate-600">
                {searchTerm
                  ? `No rules matching "${searchTerm}"`
                  : `No system rules found for ${currentProgramme.name}. Custom rules can be added below.`
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───── SECTION 4: CUSTOM RULES ───── */}
      <SectionHeader
        section="custom"
        title="Custom Rules"
        subtitle="Create organisation-level or project-specific compliance rules"
        icon={<Plus className="h-5 w-5" />}
      />
      {openSections.has('custom') && (
        <div className="space-y-3 pl-2">
          {/* Existing Custom Rules */}
          {customRules.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-900">Your Custom Rules</h4>
                <div className="text-xs text-slate-500 mt-0.5">
                  {customRules.filter(r => r.active).length} active, {customRules.filter(r => !r.active).length} disabled
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {customRules.map(rule => (
                  <div key={rule.id} className={`p-4 ${!rule.active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${severityColors[rule.severity]}`}>
                            {rule.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center gap-1">
                            {rule.scope === 'organisation'
                              ? <><Building2 className="h-3 w-3" /> Org</>
                              : <><FolderOpen className="h-3 w-3" /> Project</>
                            }
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                            {rule.module}
                          </span>
                        </div>
                        <div className="font-medium text-slate-900 mb-0.5">{rule.title}</div>
                        <div className="text-xs text-slate-500 font-mono mb-1">{rule.code}</div>
                        {rule.description && (
                          <div className="text-sm text-slate-600 mb-1">{rule.description}</div>
                        )}
                        {rule.passCriteria && (
                          <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 inline-block">
                            Pass criteria: {rule.passCriteria}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                          title={rule.active ? 'Disable rule' : 'Enable rule'}
                        >
                          {rule.active
                            ? <ToggleRight className="h-5 w-5 text-green-600" />
                            : <ToggleLeft className="h-5 w-5 text-slate-400" />
                          }
                        </button>
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                          title="Edit rule"
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create / Edit Rule Form */}
          {showCreateRule ? (
            <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-900">
                  {editingRule ? 'Edit Custom Rule' : 'Create Custom Rule'}
                </h4>
                <button onClick={resetRuleForm} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rule Code *</label>
                  <input
                    type="text"
                    value={ruleForm.code}
                    onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })}
                    placeholder="e.g., CUSTOM-001"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={ruleForm.title}
                    onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                    placeholder="e.g., Project disclaimer required on all publications"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                    placeholder="Describe what this rule checks and why it matters..."
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                  <select
                    value={ruleForm.severity}
                    onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value as CustomRule['severity'] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="critical">Critical — Audit risk</option>
                    <option value="high">High — Reporting gap</option>
                    <option value="medium">Medium — Best practice</option>
                    <option value="low">Low — Enhancement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Module</label>
                  <select
                    value={ruleForm.module}
                    onChange={(e) => setRuleForm({ ...ruleForm, module: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    {MODULE_GUIDES.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
                  <select
                    value={ruleForm.scope}
                    onChange={(e) => setRuleForm({ ...ruleForm, scope: e.target.value as CustomRule['scope'] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="project">Project — applies to this project only</option>
                    <option value="organisation">Organisation — applies to all projects in this org</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pass Criteria</label>
                  <input
                    type="text"
                    value={ruleForm.passCriteria}
                    onChange={(e) => setRuleForm({ ...ruleForm, passCriteria: e.target.value })}
                    placeholder="e.g., At least 2 publications with disclaimer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={handleSaveCustomRule}
                  disabled={!ruleForm.code.trim() || !ruleForm.title.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  {editingRule ? 'Save Changes' : 'Create Rule'}
                </button>
                <button
                  onClick={resetRuleForm}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateRule(true)}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create Custom Rule</span>
            </button>
          )}

          {/* Info box */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700 mb-1">About Custom Rules</p>
              <p>
                Custom rules let you add compliance checks specific to your organisation or project.
                <strong> Organisation-scoped</strong> rules apply across all projects in your organisation.
                <strong> Project-scoped</strong> rules apply only to the current project.
                Custom rules are evaluated alongside system rules during compliance checks.
              </p>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
