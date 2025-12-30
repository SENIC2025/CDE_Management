import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, TrendingUp, FileText, MessageSquare, Zap, HelpCircle, Library, Calendar, ClipboardList, Inbox } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import EvidencePicker from '../components/EvidencePicker';
import ProjectIndicators from '../components/ProjectIndicators';
import { usePermissions } from '../hooks/usePermissions';
import { logIndicatorChange, logEvidenceChange } from '../lib/audit';
import { DecisionSupportService, DerivedMetrics } from '../lib/decisionSupport';
import WorkQueueTab from '../components/monitoring/WorkQueueTab';
import QuickIndicatorLogDrawer from '../components/monitoring/QuickIndicatorLogDrawer';
import EvidenceInboxTab from '../components/monitoring/EvidenceInboxTab';

export default function Monitoring() {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'workqueue' | 'library' | 'indicators' | 'values' | 'evidence' | 'evidence-inbox' | 'surveys' | 'logs' | 'derived'>('workqueue');
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
  const [indicatorData, setIndicatorData] = useState({ name: '', description: '', unit: '', baseline: '', target: '', data_source: '', locked: false });
  const [evidenceData, setEvidenceData] = useState({ type: 'document', title: '', description: '', file_path: '', url: '' });
  const [surveyData, setSurveyData] = useState({ title: '', description: '', schema_json: '{}' });
  const [logData, setLogData] = useState({ outcome_description: '', context: '', observations: '' });
  const [valueData, setValueData] = useState({ period: '', value: 0, notes: '' });
  const [showValueForm, setShowValueForm] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-Q1');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>(['2025-Q1', '2024-Q4', '2024-Q3', '2024-Q2']);
  const [quickLogIndicatorId, setQuickLogIndicatorId] = useState<string | null>(null);
  const [quickLogQueue, setQuickLogQueue] = useState<string[]>([]);

  useEffect(() => {
    if (currentProject) {
      loadIndicators();
      loadEvidence();
      loadSurveys();
      loadLogs();
      loadIndicatorValues();
      loadEvidenceLinks();
    }
  }, [currentProject]);

  useEffect(() => { if (currentProject && activeTab === 'derived') { loadDerivedMetrics(); } }, [currentProject, activeTab]);

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
    setIndicatorData({ name: '', description: '', unit: '', baseline: '', target: '', data_source: '', locked: false });
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
    await supabase.from('surveys').insert({ ...surveyData, project_id: currentProject!.id });
    setSurveyData({ title: '', description: '', schema_json: '{}' });
    setShowSurveyForm(false);
    loadSurveys();
  }

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('qualitative_outcome_logs').insert({ ...logData, project_id: currentProject!.id });
    setLogData({ outcome_description: '', context: '', observations: '' });
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
    if (confirm(`Delete ${type}?`)) {
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

  const filteredIndicators = indicators.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Monitoring, Evaluation & Evidence</h1>
          <p className="text-slate-600 mt-1">Track indicators and manage evidence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              {availablePeriods.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'indicators') setShowIndicatorForm(true);
              else if (activeTab === 'evidence') setShowEvidenceForm(true);
              else if (activeTab === 'surveys') setShowSurveyForm(true);
              else if (activeTab === 'logs') setShowLogForm(true);
            }}
            disabled={!permissions.canCreate() || activeTab === 'workqueue' || activeTab === 'library' || activeTab === 'evidence-inbox' || activeTab === 'values' || activeTab === 'derived'}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <Plus size={20} />New
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b overflow-x-auto">
        <button onClick={() => setActiveTab('workqueue')} className={`px-4 py-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'workqueue' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
          <ClipboardList size={16} />Work Queue
        </button>
        <button onClick={() => setActiveTab('library')} className={`px-4 py-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'library' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
          <Library size={16} />Library
        </button>
        <button onClick={() => setActiveTab('indicators')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'indicators' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Indicators</button>
        <button onClick={() => setActiveTab('values')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'values' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Values</button>
        <button onClick={() => setActiveTab('evidence')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'evidence' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Evidence</button>
        <button onClick={() => setActiveTab('evidence-inbox')} className={`px-4 py-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'evidence-inbox' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
          <Inbox size={16} />Evidence Inbox
        </button>
        <button onClick={() => setActiveTab('surveys')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'surveys' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Surveys</button>
        <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'logs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Qualitative Logs</button>
        <button onClick={() => setActiveTab('derived')} className={`px-4 py-2 font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === 'derived' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>
          <Zap size={16} />Derived Metrics
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
          onViewEvidenceInbox={() => setActiveTab('evidence-inbox')}
        />
      )}

      {(activeTab === 'indicators' || activeTab === 'values' || activeTab === 'evidence' || activeTab === 'surveys' || activeTab === 'logs') && activeTab !== 'library' && activeTab !== 'derived' && (
        <div className="bg-slate-50 border rounded p-4"><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
      )}

      {activeTab === 'library' && (
        <div className="bg-white rounded-lg shadow p-6">
          <ProjectIndicators projectId={currentProject.id} />
        </div>
      )}

      {activeTab === 'indicators' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Indicators</h2></div>
          {filteredIndicators.length === 0 ? <div className="p-6 text-center text-slate-600">No indicators</div> : (
            <div className="divide-y">
              {filteredIndicators.map(ind => (
                <div key={ind.id} className="p-6 hover:bg-slate-50 flex justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <TrendingUp size={20} className="text-slate-400 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{ind.name}</span>
                        {ind.locked && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Locked</span>}
                      </div>
                      {ind.description && <p className="text-sm text-slate-600">{ind.description}</p>}
                      <p className="text-xs text-slate-500 mt-1">Unit: {ind.unit} | Baseline: {ind.baseline} | Target: {ind.target}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleOpenQuickLog(ind.id)} className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Quick Log</button>
                        <button onClick={() => loadIndicatorValuesFor(ind.id)} className="text-xs text-blue-600 hover:text-blue-700">View Values</button>
                        <button onClick={() => loadLinkedEvidence(ind.id)} className="text-xs text-blue-600 hover:text-blue-700">View Evidence</button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setIndicatorData({ name: ind.name, description: ind.description, unit: ind.unit, baseline: ind.baseline, target: ind.target, data_source: ind.data_source, locked: ind.locked }); setEditingId(ind.id); setShowIndicatorForm(true); }} className="text-blue-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={ind.locked || !permissions.canUpdate()}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(ind.id, 'indicator')} className="text-red-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!permissions.canDelete()}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'values' && (
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
                        <div className="font-semibold text-slate-900">{indicator?.name || 'Unknown Indicator'}</div>
                        <div className="text-sm text-slate-600 mt-1">Value: <span className="font-medium">{val.value}</span> {indicator?.unit}</div>
                        {val.notes && <p className="text-sm text-slate-500 mt-1">{val.notes}</p>}
                      </div>
                      <button
                        onClick={() => handleOpenQuickLog(val.indicator_id)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
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

      {activeTab === 'evidence-inbox' && (
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

      {activeTab === 'surveys' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Surveys</h2></div>
          {filteredSurveys.length === 0 ? <div className="p-6 text-center text-slate-600">No surveys</div> : (
            <div className="divide-y">
              {filteredSurveys.map(survey => (
                <div key={survey.id} className="p-6 hover:bg-slate-50 flex justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <MessageSquare size={20} className="text-slate-400 mt-1" />
                    <div>
                      <div className="font-semibold text-slate-900">{survey.title}</div>
                      {survey.description && <p className="text-sm text-slate-600">{survey.description}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(survey.id, 'survey')} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Qualitative Outcome Logs</h2></div>
          {filteredLogs.length === 0 ? <div className="p-6 text-center text-slate-600">No logs</div> : (
            <div className="divide-y">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-6 hover:bg-slate-50 flex justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 mb-1">{log.outcome_description}</div>
                    {log.context && <p className="text-sm text-slate-600 mb-1"><span className="font-medium">Context:</span> {log.context}</p>}
                    {log.observations && <p className="text-sm text-slate-600"><span className="font-medium">Observations:</span> {log.observations}</p>}
                  </div>
                  <button onClick={() => handleDelete(log.id, 'log')} className="text-red-600"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'derived' && (
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
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Name</label><input type="text" required value={indicatorData.name} onChange={(e) => setIndicatorData({ ...indicatorData, name: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={indicatorData.description} onChange={(e) => setIndicatorData({ ...indicatorData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Unit</label><input type="text" required value={indicatorData.unit} onChange={(e) => setIndicatorData({ ...indicatorData, unit: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Data Source</label><input type="text" value={indicatorData.data_source} onChange={(e) => setIndicatorData({ ...indicatorData, data_source: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Baseline</label><input type="text" value={indicatorData.baseline} onChange={(e) => setIndicatorData({ ...indicatorData, baseline: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Target</label><input type="text" value={indicatorData.target} onChange={(e) => setIndicatorData({ ...indicatorData, target: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
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
    </div>
  );
}
