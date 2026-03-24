import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, TrendingUp, FileText, MessageSquare, Zap, HelpCircle, Library, Calendar, ClipboardList, Inbox, Link2, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import EvidencePicker from '../components/EvidencePicker';
import ProjectIndicators from '../components/ProjectIndicators';
import { usePermissions } from '../hooks/usePermissions';
import { logIndicatorChange, logEvidenceChange } from '../lib/audit';
import { DecisionSupportService, DerivedMetrics } from '../lib/decisionSupport';
import WorkQueueTab from '../components/monitoring/WorkQueueTab';
import QuickIndicatorLogDrawer from '../components/monitoring/QuickIndicatorLogDrawer';
import EvidenceInboxTab from '../components/monitoring/EvidenceInboxTab';
import { PageHeader, PageSkeleton, ConfirmDialog } from '../components/ui';
import useConfirm from '../hooks/useConfirm';

export default function Monitoring() {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const [confirmProps, confirm] = useConfirm();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'workqueue' | 'indicators' | 'evidence' | 'engagement' | 'analytics'>('workqueue');
  const [indicatorView, setIndicatorView] = useState<'list' | 'values' | 'library'>('list');
  const [evidenceView, setEvidenceView] = useState<'all' | 'inbox'>('all');
  const [engagementView, setEngagementView] = useState<'surveys' | 'logs'>('surveys');
  const [derivedMetrics, setDerivedMetrics] = useState<DerivedMetrics | null>(null);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [indicatorValues, setIndicatorValues] = useState<any[]>([]);
  const [evidenceLinks, setEvidenceLinks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIndicatorForm, setShowIndicatorForm] = useState(false);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showValues, setShowValues] = useState<string | null>(null);
  const [showEvidenceLink, setShowEvidenceLink] = useState<string | null>(null);
  const [linkedEvidence, setLinkedEvidence] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [indicatorData, setIndicatorData] = useState({ title: '', description: '', measurement_unit: '', target_value: '', locked: false });
  const [evidenceData, setEvidenceData] = useState({ type: 'document', title: '', description: '', file_path: '', url: '' });
  const [surveyData, setSurveyData] = useState({ title: '', description: '', schema_json: '{}', activity_id: '' });
  const [logData, setLogData] = useState({ outcome_description: '', context: '', observations: '', activity_id: '' });
  const [activities, setActivities] = useState<any[]>([]);
  const [valueData, setValueData] = useState({ period: '', value: 0, notes: '' });
  const [showValueForm, setShowValueForm] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [quickLogIndicatorId, setQuickLogIndicatorId] = useState<string | null>(null);
  const [quickLogQueue, setQuickLogQueue] = useState<string[]>([]);

  // Smart periods: derive from actual data + always include current & next quarter
  const availablePeriods = useMemo(() => {
    const now = new Date();
    const currentQ = Math.ceil((now.getMonth() + 1) / 3);
    const currentYear = now.getFullYear();

    const periods = new Set<string>();
    // Always include current quarter
    periods.add(`${currentYear}-Q${currentQ}`);
    // Include previous quarter
    const prevQ = currentQ === 1 ? 4 : currentQ - 1;
    const prevY = currentQ === 1 ? currentYear - 1 : currentYear;
    periods.add(`${prevY}-Q${prevQ}`);

    // Add all periods from actual indicator values
    indicatorValues.forEach(v => {
      if (v.period) periods.add(v.period);
    });

    return Array.from(periods).sort().reverse();
  }, [indicatorValues]);

  // Auto-select current quarter if no period selected
  useEffect(() => {
    if (!selectedPeriod && availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedPeriod]);

  // Computed stats
  const stats = useMemo(() => {
    const indicatorsWithValues = new Set(indicatorValues.map(v => v.indicator_id));
    const indicatorsTracked = indicators.filter(i => indicatorsWithValues.has(i.id)).length;
    const surveysLinked = surveys.filter(s => s.activity_id).length;
    const logsLinked = logs.filter(l => l.activity_id).length;
    const valuesThisPeriod = indicatorValues.filter(v => v.period === selectedPeriod).length;

    return {
      totalIndicators: indicators.length,
      indicatorsTracked,
      totalEvidence: evidence.length,
      totalSurveys: surveys.length,
      surveysLinked,
      totalLogs: logs.length,
      logsLinked,
      valuesThisPeriod,
    };
  }, [indicators, evidence, surveys, logs, indicatorValues, selectedPeriod]);

  useEffect(() => {
    if (currentProject) {
      loadIndicators();
      loadEvidence();
      loadSurveys();
      loadLogs();
      loadIndicatorValues();
      loadEvidenceLinks();
      loadActivities();
    }
  }, [currentProject]);

  async function loadActivities() {
    const { data } = await supabase
      .from('activities')
      .select('id, title, domain, status')
      .eq('project_id', currentProject!.id)
      .is('deleted_at', null)
      .order('title', { ascending: true });
    setActivities(data || []);
  }

  useEffect(() => { if (currentProject && activeTab === 'analytics') { loadDerivedMetrics(); } }, [currentProject, activeTab]);

  async function loadIndicators() {
    console.log('[ME] Loading indicators');
    const { data } = await supabase.from('indicators').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setIndicators(data || []);
  }

  async function loadEvidence() {
    console.log('[ME] Loading evidence');
    const { data } = await supabase.from('evidence_items').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setEvidence(data || []);
  }

  async function loadSurveys() {
    const { data } = await supabase.from('surveys').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setSurveys(data || []);
  }

  async function loadLogs() {
    const { data } = await supabase.from('qualitative_outcome_logs').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setLogs(data || []);
  }

  async function loadIndicatorValues() {
    console.log('[ME] Loading indicator values');
    const { data } = await supabase.from('indicator_values').select('*').eq('project_id', currentProject!.id).order('period', { ascending: false });
    setIndicatorValues(data || []);
  }

  async function loadEvidenceLinks() {
    console.log('[ME] Loading evidence links');
    const { data } = await supabase.from('evidence_links').select('*');
    setEvidenceLinks(data || []);
  }

  async function loadDerivedMetrics() {
    if (!currentProject) return;
    try {
      const service = new DecisionSupportService(currentProject.id);
      await service.initialize();
      const metrics = await service.calculateDerivedMetrics();
      setDerivedMetrics(metrics);
    } catch (error) {
      console.error('Error loading derived metrics:', error);
    }
  }

  async function handleIndicatorSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      const oldIndicator = indicators.find(i => i.id === editingId);
      await supabase.from('indicators').update(indicatorData).eq('id', editingId);
      if (profile && currentProject) {
        await logIndicatorChange(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'update',
          editingId,
          oldIndicator,
          indicatorData
        );
      }
    } else {
      const { data } = await supabase.from('indicators').insert({ ...indicatorData, project_id: currentProject!.id }).select().single();
      if (data && profile && currentProject) {
        await logIndicatorChange(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'create',
          data.id,
          undefined,
          data
        );
      }
    }
    setIndicatorData({ title: '', description: '', measurement_unit: '', target_value: '', locked: false });
    setEditingId(null);
    setShowIndicatorForm(false);
    loadIndicators();
  }

  async function handleEvidenceSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await supabase.from('evidence_items').insert({ ...evidenceData, project_id: currentProject!.id }).select().single();
    if (data && profile && currentProject) {
      await logEvidenceChange(
        currentProject.org_id,
        currentProject.id,
        profile.id,
        'create',
        data.id,
        undefined,
        data
      );
    }
    setEvidenceData({ type: 'document', title: '', description: '', file_path: '', url: '' });
    setShowEvidenceForm(false);
    loadEvidence();
  }

  async function handleSurveySubmit(e: React.FormEvent) {
    e.preventDefault();
    const insertData: any = {
      title: surveyData.title,
      description: surveyData.description,
      schema_json: surveyData.schema_json,
      project_id: currentProject!.id,
    };
    if (surveyData.activity_id) {
      insertData.activity_id = surveyData.activity_id;
    }
    await supabase.from('surveys').insert(insertData);
    setSurveyData({ title: '', description: '', schema_json: '{}', activity_id: '' });
    setShowSurveyForm(false);
    loadSurveys();
  }

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    const insertData: any = {
      outcome_description: logData.outcome_description,
      context: logData.context,
      observations: logData.observations,
      project_id: currentProject!.id,
    };
    if (logData.activity_id) {
      insertData.activity_id = logData.activity_id;
    }
    await supabase.from('qualitative_outcome_logs').insert(insertData);
    setLogData({ outcome_description: '', context: '', observations: '', activity_id: '' });
    setShowLogForm(false);
    loadLogs();
  }

  async function handleValueSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('indicator_values').insert({ ...valueData, indicator_id: showValues, project_id: currentProject!.id });
    setValueData({ period: '', value: 0, notes: '' });
    setShowValueForm(false);
    loadIndicatorValues();
    if (showValues) loadIndicatorValuesFor(showValues);
  }

  async function handleDelete(id: string, type: 'indicator' | 'evidence' | 'survey' | 'log') {
    const ok = await confirm({ title: `Delete ${type}?`, message: `This ${type} will be permanently removed.` });
    if (ok) {
      const table = type === 'indicator' ? 'indicators' : type === 'evidence' ? 'evidence_items' : type === 'survey' ? 'surveys' : 'qualitative_outcome_logs';

      if (type === 'indicator' && profile && currentProject) {
        const oldIndicator = indicators.find(i => i.id === id);
        await supabase.from(table).delete().eq('id', id);
        await logIndicatorChange(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'delete',
          id,
          oldIndicator,
          undefined
        );
      } else if (type === 'evidence' && profile && currentProject) {
        const oldEvidence = evidence.find(e => e.id === id);
        await supabase.from(table).delete().eq('id', id);
        await logEvidenceChange(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'delete',
          id,
          oldEvidence,
          undefined
        );
      } else {
        await supabase.from(table).delete().eq('id', id);
      }

      if (type === 'indicator') loadIndicators();
      else if (type === 'evidence') loadEvidence();
      else if (type === 'survey') loadSurveys();
      else loadLogs();
    }
  }

  const [indicatorValuesForModal, setIndicatorValuesForModal] = useState<any[]>([]);

  async function loadIndicatorValuesFor(indicatorId: string) {
    const { data } = await supabase.from('indicator_values').select('*').eq('indicator_id', indicatorId).order('period', { ascending: false });
    setIndicatorValuesForModal(data || []);
    setShowValues(indicatorId);
  }

  async function loadLinkedEvidence(indicatorId: string) {
    const { data } = await supabase.from('evidence_links').select('evidence_item_id').eq('indicator_id', indicatorId);
    setLinkedEvidence(data?.map(d => d.evidence_item_id) || []);
    setShowEvidenceLink(indicatorId);
  }

  const handleOpenQuickLog = (indicatorId: string, queue: string[] = []) => {
    setQuickLogIndicatorId(indicatorId);
    setQuickLogQueue(queue);
  };

  const handleQuickLogNext = () => {
    if (!quickLogIndicatorId || quickLogQueue.length === 0) return;
    const currentIndex = quickLogQueue.indexOf(quickLogIndicatorId);
    if (currentIndex < quickLogQueue.length - 1) {
      setQuickLogIndicatorId(quickLogQueue[currentIndex + 1]);
    }
  };

  const filteredIndicators = indicators.filter(i => (i.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredEvidence = evidence.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSurveys = surveys.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredLogs = logs.filter(l => l.outcome_description.toLowerCase().includes(searchTerm.toLowerCase()));

  const valuesForPeriod = useMemo(() => {
    return indicatorValues.filter(v => v.period === selectedPeriod);
  }, [indicatorValues, selectedPeriod]);

  const currentIndicator = indicators.find(ind => ind.id === quickLogIndicatorId) || null;

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project to manage M&E and evidence</p></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Monitoring, Evaluation & Evidence"
        subtitle="Track indicators and manage evidence"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#4E5652]" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1BAE70]/40 focus:border-[#1BAE70] bg-white text-sm"
              >
                {availablePeriods.map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
            {(() => {
              let newLabel = '';
              let newAction: (() => void) | null = null;
              if (activeTab === 'indicators' && indicatorView === 'list') {
                newLabel = 'Indicator';
                newAction = () => setShowIndicatorForm(true);
              } else if (activeTab === 'evidence' && evidenceView === 'all') {
                newLabel = 'Evidence';
                newAction = () => setShowEvidenceForm(true);
              } else if (activeTab === 'engagement' && engagementView === 'surveys') {
                newLabel = 'Survey';
                newAction = () => setShowSurveyForm(true);
              } else if (activeTab === 'engagement' && engagementView === 'logs') {
                newLabel = 'Log';
                newAction = () => setShowLogForm(true);
              }
              if (!newAction) return null;
              return (
                <button
                  onClick={newAction}
                  className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
                >
                  <Plus size={18} />New {newLabel}
                </button>
              );
            })()}
          </div>
        }
      />

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <button onClick={() => setActiveTab('indicators')} className="bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-200 transition-all text-left">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-blue-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Indicators</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalIndicators}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {stats.indicatorsTracked > 0 ? (
              <span className="text-green-600">{stats.indicatorsTracked} tracked</span>
            ) : (
              <span className="text-amber-500">None tracked yet</span>
            )}
          </div>
        </button>

        <button onClick={() => { setActiveTab('indicators'); setIndicatorView('values'); }} className="bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-200 transition-all text-left">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-emerald-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">This Period</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.valuesThisPeriod}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {stats.totalIndicators > 0 ? (
              stats.valuesThisPeriod >= stats.totalIndicators ? (
                <span className="text-green-600">All logged</span>
              ) : (
                <span className="text-amber-500">{stats.totalIndicators - stats.valuesThisPeriod} missing</span>
              )
            ) : (
              <span>values logged</span>
            )}
          </div>
        </button>

        <button onClick={() => setActiveTab('evidence')} className="bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-200 transition-all text-left">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-violet-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Evidence</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalEvidence}</div>
          <div className="text-xs text-slate-500 mt-0.5">items collected</div>
        </button>

        <button onClick={() => { setActiveTab('engagement'); setEngagementView('surveys'); }} className="bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-200 transition-all text-left">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={16} className="text-cyan-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Surveys</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalSurveys}</div>
          <div className="text-xs mt-0.5">
            {stats.totalSurveys > 0 ? (
              stats.surveysLinked === stats.totalSurveys ? (
                <span className="text-green-600">All linked</span>
              ) : (
                <span className="text-amber-500">{stats.totalSurveys - stats.surveysLinked} unlinked</span>
              )
            ) : (
              <span className="text-slate-500">none yet</span>
            )}
          </div>
        </button>

        <button onClick={() => { setActiveTab('engagement'); setEngagementView('logs'); }} className="bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-200 transition-all text-left">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-orange-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Outcome Logs</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalLogs}</div>
          <div className="text-xs mt-0.5">
            {stats.totalLogs > 0 ? (
              stats.logsLinked === stats.totalLogs ? (
                <span className="text-green-600">All linked</span>
              ) : (
                <span className="text-amber-500">{stats.totalLogs - stats.logsLinked} unlinked</span>
              )
            ) : (
              <span className="text-slate-500">none yet</span>
            )}
          </div>
        </button>

        <button onClick={() => setActiveTab('analytics')} className="bg-white rounded-lg shadow p-4 hover:ring-2 hover:ring-blue-200 transition-all text-left">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-amber-500" />
            <span className="text-xs font-medium text-slate-500 uppercase">Engagement</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.surveysLinked + stats.logsLinked}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">linked signals</div>
        </button>
      </div>

      {/* Main Tab Bar — 5 consolidated tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        <button onClick={() => setActiveTab('workqueue')} className={`px-4 py-2.5 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'workqueue' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <ClipboardList size={16} />Work Queue
        </button>
        <button onClick={() => setActiveTab('indicators')} className={`px-4 py-2.5 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'indicators' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <TrendingUp size={16} />Indicators
          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{indicators.length}</span>
        </button>
        <button onClick={() => setActiveTab('evidence')} className={`px-4 py-2.5 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'evidence' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <FileText size={16} />Evidence
          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{evidence.length}</span>
        </button>
        <button onClick={() => setActiveTab('engagement')} className={`px-4 py-2.5 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'engagement' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <MessageSquare size={16} />Engagement
          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{surveys.length + logs.length}</span>
        </button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2.5 font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${activeTab === 'analytics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
          <Zap size={16} />Analytics
        </button>
      </div>

      {activeTab === 'workqueue' && (
        <WorkQueueTab
          projectId={currentProject.id}
          selectedPeriod={selectedPeriod}
          indicators={indicators}
          indicatorValues={indicatorValues}
          evidenceLinks={evidenceLinks}
          onLogValue={(indicatorId) => {
            const missingIds = indicators
              .filter(ind => !indicatorValues.some(v => v.indicator_id === ind.id && v.period === selectedPeriod))
              .map(ind => ind.id);
            handleOpenQuickLog(indicatorId, missingIds);
          }}
          onAttachEvidence={(indicatorId) => handleOpenQuickLog(indicatorId)}
          onViewEvidenceInbox={() => { setActiveTab('evidence'); setEvidenceView('inbox'); }}
        />
      )}

      {/* Indicators Tab — consolidated: List / Values / Library */}
      {activeTab === 'indicators' && (
        <>
          {/* Sub-view toggle */}
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setIndicatorView('list')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${indicatorView === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                Indicators ({indicators.length})
              </button>
              <button onClick={() => setIndicatorView('values')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${indicatorView === 'values' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                Period Values ({valuesForPeriod.length})
              </button>
              <button onClick={() => setIndicatorView('library')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${indicatorView === 'library' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <Library size={14} />Library
              </button>
            </div>
            {indicatorView !== 'library' && (
              <div className="flex-1"><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
            )}
          </div>

          {/* Indicator List sub-view */}
          {indicatorView === 'list' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b"><h2 className="text-lg font-semibold">Indicators</h2></div>
              {filteredIndicators.length === 0 ? <div className="p-6 text-center text-slate-600">No indicators</div> : (
                <div className="divide-y">
                  {filteredIndicators.map(ind => {
                    const baseline = 0;
                    const target = Number(ind.target_value) || 0;
                    const latestValues = indicatorValues
                      .filter(v => v.indicator_id === ind.id)
                      .sort((a: any, b: any) => (a.period > b.period ? -1 : 1));
                    const latestValue = latestValues.length > 0 ? Number(latestValues[0].value) || 0 : null;
                    const hasNumericTargets = target > 0 && target !== baseline;
                    const progressPct = hasNumericTargets && latestValue !== null
                      ? Math.min(100, Math.max(0, ((latestValue - baseline) / (target - baseline)) * 100))
                      : null;
                    const isOnTrack = progressPct !== null && progressPct >= 50;
                    const isComplete = progressPct !== null && progressPct >= 100;
                    const evidenceCount = evidenceLinks.filter(el => el.indicator_id === ind.id).length;

                    return (
                      <div key={ind.id} className="p-6 hover:bg-slate-50 flex justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <TrendingUp size={20} className={`mt-1 ${isComplete ? 'text-green-500' : isOnTrack ? 'text-blue-500' : 'text-slate-400'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900">{ind.title}</span>
                              {ind.locked && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Locked</span>}
                              {isComplete && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Target reached</span>}
                            </div>
                            {ind.description && <p className="text-sm text-slate-600">{ind.description}</p>}

                            {hasNumericTargets ? (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-slate-500 w-20">Baseline: 0</span>
                                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                                    <div
                                      className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : isOnTrack ? 'bg-blue-500' : 'bg-amber-500'}`}
                                      style={{ width: `${progressPct ?? 0}%` }}
                                    />
                                    {latestValue !== null && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className={`text-[10px] font-bold ${(progressPct ?? 0) > 50 ? 'text-white' : 'text-slate-600'}`}>
                                          {latestValue} {ind.measurement_unit}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-slate-500 w-20 text-right">Target: {ind.target_value}</span>
                                </div>
                                {latestValue !== null && (
                                  <div className="text-xs text-slate-500">
                                    {Math.round(progressPct ?? 0)}% progress
                                    {latestValues[0]?.period && <span className="ml-1 text-slate-400">({latestValues[0].period})</span>}
                                  </div>
                                )}
                                {latestValue === null && (
                                  <div className="text-xs text-amber-500 flex items-center gap-1">
                                    <AlertTriangle size={10} />No values logged yet
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1">
                                <p className="text-xs text-slate-500">Unit: {ind.measurement_unit} | Target: {ind.target_value}</p>
                                {latestValue !== null && (
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    Latest: <span className="font-medium">{latestValue} {ind.measurement_unit}</span>
                                    {latestValues[0]?.period && <span className="text-slate-400 ml-1">({latestValues[0].period})</span>}
                                  </p>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleOpenQuickLog(ind.id)} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Quick Log</button>
                              <button onClick={() => loadIndicatorValuesFor(ind.id)} className="text-xs text-blue-600 hover:text-blue-700">Values ({latestValues.length})</button>
                              <button onClick={() => loadLinkedEvidence(ind.id)} className="text-xs text-blue-600 hover:text-blue-700">Evidence ({evidenceCount})</button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setIndicatorData({ title: ind.title || '', description: ind.description || '', measurement_unit: ind.measurement_unit || '', target_value: ind.target_value?.toString() || '', locked: ind.locked || false }); setEditingId(ind.id); setShowIndicatorForm(true); }} className="text-blue-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={ind.locked || !permissions.canUpdate()}><Edit size={18} /></button>
                          <button onClick={() => handleDelete(ind.id, 'indicator')} className="text-red-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!permissions.canDelete()}><Trash2 size={18} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Period Values sub-view */}
          {indicatorView === 'values' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Indicator Values for {selectedPeriod}</h2>
                <p className="text-sm text-slate-600 mt-1">{valuesForPeriod.length} value{valuesForPeriod.length !== 1 ? 's' : ''} logged</p>
              </div>
              {valuesForPeriod.length === 0 ? <div className="p-6 text-center text-slate-600">No values for this period</div> : (
                <div className="divide-y">
                  {valuesForPeriod.map(val => {
                    const indicator = indicators.find(ind => ind.id === val.indicator_id);
                    return (
                      <div key={val.id} className="p-6 hover:bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900">{indicator?.title || 'Unknown Indicator'}</div>
                            <div className="text-sm text-slate-600 mt-1">Value: <span className="font-medium">{val.value}</span> {indicator?.measurement_unit}</div>
                            {val.notes && <p className="text-sm text-slate-500 mt-1">{val.notes}</p>}
                          </div>
                          <button onClick={() => handleOpenQuickLog(val.indicator_id)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Library sub-view */}
          {indicatorView === 'library' && (
            <div className="bg-white rounded-lg shadow p-6">
              <ProjectIndicators projectId={currentProject.id} />
            </div>
          )}
        </>
      )}

      {/* Evidence Tab — consolidated: All / Inbox */}
      {activeTab === 'evidence' && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setEvidenceView('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${evidenceView === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                All Evidence ({evidence.length})
              </button>
              <button onClick={() => setEvidenceView('inbox')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${evidenceView === 'inbox' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <Inbox size={14} />Inbox
              </button>
            </div>
            {evidenceView === 'all' && (
              <div className="flex-1"><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
            )}
          </div>

          {evidenceView === 'all' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b"><h2 className="text-lg font-semibold">Evidence Repository</h2></div>
              {filteredEvidence.length === 0 ? <div className="p-6 text-center text-slate-600">No evidence items</div> : (
                <div className="divide-y">
                  {filteredEvidence.map(ev => (
                    <div key={ev.id} className="p-6 hover:bg-slate-50 flex justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText size={20} className="text-slate-400 mt-1" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-900">{ev.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{ev.type}</span>
                          </div>
                          {ev.description && <p className="text-sm text-slate-600">{ev.description}</p>}
                          {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">{ev.url}</a>}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(ev.id, 'evidence')} className="text-red-600"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {evidenceView === 'inbox' && (
            <EvidenceInboxTab
              projectId={currentProject.id}
              evidenceItems={evidence}
              evidenceLinks={evidenceLinks}
              indicators={indicators}
              onRefresh={() => {
                loadEvidence();
                loadEvidenceLinks();
              }}
            />
          )}
        </>
      )}

      {/* Engagement Tab — consolidated: Surveys / Qualitative Logs */}
      {activeTab === 'engagement' && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setEngagementView('surveys')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${engagementView === 'surveys' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <MessageSquare size={14} />Surveys ({surveys.length})
              </button>
              <button onClick={() => setEngagementView('logs')} className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${engagementView === 'logs' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>
                <CheckCircle size={14} />Outcome Logs ({logs.length})
              </button>
            </div>
            <div className="flex-1"><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
          </div>

          {/* Linking status bar */}
          {(() => {
            const total = engagementView === 'surveys' ? stats.totalSurveys : stats.totalLogs;
            const linked = engagementView === 'surveys' ? stats.surveysLinked : stats.logsLinked;
            const unlinked = total - linked;
            if (total === 0) return null;
            return (
              <div className="flex items-center gap-3 bg-white rounded-lg shadow px-4 py-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(linked / total) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  <span className="text-green-600 font-medium">{linked}</span> linked
                  {unlinked > 0 && <span className="text-amber-500 ml-2">{unlinked} unlinked</span>}
                </span>
              </div>
            );
          })()}

          {engagementView === 'surveys' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b"><h2 className="text-lg font-semibold">Surveys</h2></div>
              {filteredSurveys.length === 0 ? <div className="p-6 text-center text-slate-600">No surveys yet. Create one to track stakeholder feedback.</div> : (
                <div className="divide-y">
                  {filteredSurveys.map(survey => {
                    const linkedActivity = survey.activity_id ? activities.find(a => a.id === survey.activity_id) : null;
                    return (
                      <div key={survey.id} className="p-6 hover:bg-slate-50 flex justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <MessageSquare size={20} className="text-slate-400 mt-1" />
                          <div>
                            <div className="font-semibold text-slate-900">{survey.title}</div>
                            {survey.description && <p className="text-sm text-slate-600">{survey.description}</p>}
                            {linkedActivity ? (
                              <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                <Link2 size={10} />
                                {linkedActivity.title} ({linkedActivity.domain})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                                No activity linked
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(survey.id, 'survey')} className="text-red-600"><Trash2 size={18} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {engagementView === 'logs' && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b"><h2 className="text-lg font-semibold">Qualitative Outcome Logs</h2></div>
              {filteredLogs.length === 0 ? <div className="p-6 text-center text-slate-600">No outcome logs yet. Record qualitative observations from your activities.</div> : (
                <div className="divide-y">
                  {filteredLogs.map(log => {
                    const linkedActivity = log.activity_id ? activities.find(a => a.id === log.activity_id) : null;
                    return (
                      <div key={log.id} className="p-6 hover:bg-slate-50 flex justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 mb-1">{log.outcome_description}</div>
                          {linkedActivity ? (
                            <span className="inline-flex items-center gap-1 mb-1.5 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <Link2 size={10} />
                              {linkedActivity.title} ({linkedActivity.domain})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mb-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                              No activity linked
                            </span>
                          )}
                          {log.context && <p className="text-sm text-slate-600 mb-1"><span className="font-medium">Context:</span> {log.context}</p>}
                          {log.observations && <p className="text-sm text-slate-600"><span className="font-medium">Observations:</span> {log.observations}</p>}
                        </div>
                        <button onClick={() => handleDelete(log.id, 'log')} className="text-red-600"><Trash2 size={18} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Derived Metrics</h2>
                <button
                  onClick={loadDerivedMetrics}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Zap size={16} />
                  Refresh
                </button>
              </div>
              <p className="text-sm text-slate-600 mt-1">Computed analytics based on activities, evidence, and engagement</p>
            </div>
            {!derivedMetrics ? (
              <div className="p-6 text-center text-slate-600">Loading metrics...</div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-base font-semibold text-slate-900">Cost per Meaningful Engagement</h3>
                    <button className="text-slate-400 hover:text-slate-600" title="Cost proxy (budget or effort × hourly rate) divided by total engagement (surveys, outcomes, uptake signals)">
                      <HelpCircle size={16} />
                    </button>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-slate-600 mb-1">Overall Project</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {derivedMetrics.cost_per_meaningful_engagement_overall !== null
                        ? `€${derivedMetrics.cost_per_meaningful_engagement_overall.toFixed(2)}`
                        : 'N/A'}
                    </div>
                  </div>
                  {Object.keys(derivedMetrics.cost_per_meaningful_engagement_by_channel).length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-2">By Channel</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(derivedMetrics.cost_per_meaningful_engagement_by_channel).map(([channel, cost]) => (
                          <div key={channel} className="bg-slate-50 rounded p-3 flex items-center justify-between">
                            <span className="text-sm text-slate-700">{channel}</span>
                            <span className="text-lg font-bold text-slate-900">€{cost.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-base font-semibold text-slate-900">Evidence-Adjusted Reach</h3>
                    <button className="text-slate-400 hover:text-slate-600" title="Total reach weighted by evidence completeness score (reach × evidence_score/100)">
                      <HelpCircle size={16} />
                    </button>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-slate-600 mb-1">Overall Project</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {derivedMetrics.evidence_adjusted_reach_overall.toFixed(0)}
                    </div>
                  </div>
                  {Object.keys(derivedMetrics.evidence_adjusted_reach_by_channel).length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-2">By Channel</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(derivedMetrics.evidence_adjusted_reach_by_channel).map(([channel, reach]) => (
                          <div key={channel} className="bg-slate-50 rounded p-3 flex items-center justify-between">
                            <span className="text-sm text-slate-700">{channel}</span>
                            <span className="text-lg font-bold text-slate-900">{reach.toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-base font-semibold text-slate-900">Uptake Lag</h3>
                    <button className="text-slate-400 hover:text-slate-600" title="Time (in days) between asset dissemination and first uptake signal">
                      <HelpCircle size={16} />
                    </button>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-slate-600 mb-1">Median (days)</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {derivedMetrics.uptake_lag_median_days !== null
                        ? `${derivedMetrics.uptake_lag_median_days} days`
                        : 'N/A'}
                    </div>
                  </div>
                  {Object.keys(derivedMetrics.uptake_lag_by_asset_type).length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-slate-700 mb-2">By Asset Type</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(derivedMetrics.uptake_lag_by_asset_type).map(([type, lag]) => (
                          <div key={type} className="bg-slate-50 rounded p-3 flex items-center justify-between">
                            <span className="text-sm text-slate-700">{type}</span>
                            <span className="text-lg font-bold text-slate-900">{lag.toFixed(0)} days</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showIndicatorForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Indicator</h3></div>
            <form onSubmit={handleIndicatorSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={indicatorData.title} onChange={(e) => setIndicatorData({ ...indicatorData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={indicatorData.description} onChange={(e) => setIndicatorData({ ...indicatorData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Measurement Unit</label><input type="text" required value={indicatorData.measurement_unit} onChange={(e) => setIndicatorData({ ...indicatorData, measurement_unit: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Target Value</label><input type="text" value={indicatorData.target_value} onChange={(e) => setIndicatorData({ ...indicatorData, target_value: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={indicatorData.locked} onChange={(e) => setIndicatorData({ ...indicatorData, locked: e.target.checked })} className="rounded" disabled={!permissions.canLockIndicator()} /><span className="text-sm">Lock indicator (prevent editing){!permissions.canLockIndicator() && ' (requires CDE Lead, Coordinator, or Admin role)'}</span></label></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowIndicatorForm(false); setEditingId(null); }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEvidenceForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">New Evidence Item</h3></div>
            <form onSubmit={handleEvidenceSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Type</label><select required value={evidenceData.type} onChange={(e) => setEvidenceData({ ...evidenceData, type: e.target.value })} className="w-full px-3 py-2 border rounded"><option value="document">Document</option><option value="photo">Photo</option><option value="video">Video</option><option value="data">Data</option><option value="link">Link</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={evidenceData.title} onChange={(e) => setEvidenceData({ ...evidenceData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={evidenceData.description} onChange={(e) => setEvidenceData({ ...evidenceData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">URL</label><input type="url" value={evidenceData.url} onChange={(e) => setEvidenceData({ ...evidenceData, url: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowEvidenceForm(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSurveyForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">New Survey</h3></div>
            <form onSubmit={handleSurveySubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={surveyData.title} onChange={(e) => setSurveyData({ ...surveyData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={surveyData.description} onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={14} className="text-blue-500" />
                      Linked Activity
                      <span className="text-xs font-normal text-slate-500">(feeds Channel Effectiveness)</span>
                    </span>
                  </label>
                  <select
                    value={surveyData.activity_id}
                    onChange={(e) => setSurveyData({ ...surveyData, activity_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">— No activity linked —</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.title || 'Untitled'} ({a.domain}) {a.status !== 'active' ? `[${a.status}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Schema JSON</label><textarea value={surveyData.schema_json} onChange={(e) => setSurveyData({ ...surveyData, schema_json: e.target.value })} rows={4} className="w-full px-3 py-2 border rounded font-mono text-sm" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowSurveyForm(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">New Qualitative Log</h3></div>
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Outcome Description</label><textarea required value={logData.outcome_description} onChange={(e) => setLogData({ ...logData, outcome_description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={14} className="text-blue-500" />
                      Linked Activity
                      <span className="text-xs font-normal text-slate-500">(feeds Channel Effectiveness)</span>
                    </span>
                  </label>
                  <select
                    value={logData.activity_id}
                    onChange={(e) => setLogData({ ...logData, activity_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">— No activity linked —</option>
                    {activities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.title || 'Untitled'} ({a.domain}) {a.status !== 'active' ? `[${a.status}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Context</label><textarea value={logData.context} onChange={(e) => setLogData({ ...logData, context: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Observations</label><textarea value={logData.observations} onChange={(e) => setLogData({ ...logData, observations: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
                <button type="button" onClick={() => setShowLogForm(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showValues && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Indicator Values</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowValueForm(true)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Add Value</button>
                <button onClick={() => setShowValues(null)} className="text-slate-400 hover:text-slate-600">Close</button>
              </div>
            </div>
            <div className="p-6">
              {indicatorValuesForModal.length === 0 ? <p className="text-center text-slate-600">No values recorded</p> : (
                <div className="space-y-2">
                  {indicatorValuesForModal.map(val => (
                    <div key={val.id} className="flex justify-between p-3 bg-slate-50 rounded">
                      <div><span className="font-medium">{val.period}</span> <span className="text-slate-600">- Value: {val.value}</span>{val.notes && <p className="text-sm text-slate-500">{val.notes}</p>}</div>
                    </div>
                  ))}
                </div>
              )}
              {showValueForm && (
                <form onSubmit={handleValueSubmit} className="mt-4 p-4 border rounded space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium mb-1">Period</label><input type="text" required value={valueData.period} onChange={(e) => setValueData({ ...valueData, period: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" /></div>
                    <div><label className="block text-sm font-medium mb-1">Value</label><input type="number" step="any" required value={valueData.value} onChange={(e) => setValueData({ ...valueData, value: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded text-sm" /></div>
                    <div className="col-span-2"><label className="block text-sm font-medium mb-1">Notes</label><textarea value={valueData.notes} onChange={(e) => setValueData({ ...valueData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded text-sm" /></div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">Add</button>
                    <button type="button" onClick={() => setShowValueForm(false)} className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-300">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showEvidenceLink && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Evidence for Indicator</h3>
              <button onClick={() => setShowEvidenceLink(null)} className="text-slate-400 hover:text-slate-600">Close</button>
            </div>
            <div className="p-6">
              <EvidencePicker linkedEvidenceIds={linkedEvidence} onLink={(id) => setLinkedEvidence([...linkedEvidence, id])} onUnlink={(id) => setLinkedEvidence(linkedEvidence.filter(e => e !== id))} entityType="indicator" entityId={showEvidenceLink} />
            </div>
          </div>
        </div>
      )}

      {quickLogIndicatorId && currentIndicator && (
        <QuickIndicatorLogDrawer
          indicator={currentIndicator}
          projectId={currentProject.id}
          selectedPeriod={selectedPeriod}
          queue={quickLogQueue}
          onClose={() => {
            setQuickLogIndicatorId(null);
            setQuickLogQueue([]);
          }}
          onSaved={() => {
            loadIndicatorValues();
            loadEvidenceLinks();
          }}
          onNext={handleQuickLogNext}
        />
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
