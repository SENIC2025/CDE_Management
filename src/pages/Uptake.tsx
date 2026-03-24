import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { Plus, Edit, Trash2, Target, FileText, Search, Filter, X, CheckSquare, Square, ChevronDown, Wand2 } from 'lucide-react';
import PipelineBoard from '../components/exploitation/PipelineBoard';
import WorkQueue from '../components/exploitation/WorkQueue';
import OpportunityDrawer from '../components/exploitation/OpportunityDrawer';
import UptakeDashboard from '../components/exploitation/UptakeDashboard';
import ExploitationExport from '../components/exploitation/ExploitationExport';
import ExploitationWizard from '../components/exploitation/ExploitationWizard';
import { ExploitationMetadataStore, EXPLOITATION_TYPES } from '../lib/exploitationMetadata';
import type { ExploitationType } from '../lib/exploitationMetadata';
import { PageHeader, PageSkeleton, ConfirmDialog } from '../components/ui';
import useConfirm from '../hooks/useConfirm';

export default function Uptake() {
  const { currentProject } = useProject();
  const { currentOrganisation } = useOrganisation();
  const [confirmProps, confirm] = useConfirm();
  const [activeTab, setActiveTab] = useState<'board' | 'queue' | 'opportunities' | 'agreements' | 'assets'>('board');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [showAgreementForm, setShowAgreementForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [opportunityData, setOpportunityData] = useState({
    organisation_name: '',
    contact_person: '',
    stage: 'identified',
    next_action: '',
    notes: '',
    asset_id: '',
    exploitation_type: '' as ExploitationType,
    priority: 'medium' as 'low' | 'medium' | 'high',
    next_action_due: ''
  });
  const [agreementData, setAgreementData] = useState({
    opportunity_id: '',
    type: 'license',
    title: '',
    status: 'draft',
    agreement_date: '',
    notes: '',
    file_url: ''
  });

  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStageTarget, setBulkStageTarget] = useState('');
  const [showBulkStageDropdown, setShowBulkStageDropdown] = useState(false);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (currentProject) {
      loadData();
    }
  }, [currentProject]);

  async function loadData() {
    await Promise.all([loadOpportunities(), loadAgreements(), loadAssets()]);
  }

  async function loadOpportunities() {
    try {
      console.log('[Exploitation] Loading opportunities');
      const { data, error } = await supabase
        .from('uptake_opportunities')
        .select('*')
        .eq('project_id', currentProject!.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error: any) {
      console.error('[Exploitation] Error loading opportunities:', error);
    }
  }

  async function loadAgreements() {
    try {
      const { data, error } = await supabase
        .from('agreement_records')
        .select('*')
        .eq('project_id', currentProject!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgreements(data || []);
    } catch (error: any) {
      console.error('[Exploitation] Error loading agreements:', error);
    }
  }

  async function loadAssets() {
    try {
      const { data, error } = await supabase
        .from('result_assets')
        .select('id, title, type')
        .eq('project_id', currentProject!.id)
        .order('title');

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('[Exploitation] Error loading assets:', error);
    }
  }

  async function handleOpportunitySubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      console.log('[Exploitation] Saving opportunity');

      // Only send real DB columns — exploitation_type, priority, next_action_due are metadata (localStorage)
      const dbPayload = {
        organisation_name: opportunityData.organisation_name,
        contact_person: opportunityData.contact_person || null,
        stage: opportunityData.stage,
        next_action: opportunityData.next_action || null,
        notes: opportunityData.notes || null,
        asset_id: opportunityData.asset_id || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from('uptake_opportunities')
          .update({
            ...dbPayload,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('uptake_opportunities')
          .insert({
            ...dbPayload,
            project_id: currentProject!.id,
          });

        if (error) throw error;
      }

      // Save metadata (exploitation type, priority, due date) to local store
      if (currentOrganisation && currentProject) {
        // For new items we need the inserted ID — reload first, then save metadata
        // For edits, we already have editingId
        if (editingId) {
          ExploitationMetadataStore.setMetadata(
            currentOrganisation.id, currentProject.id, editingId,
            {
              exploitationType: opportunityData.exploitation_type || undefined,
              priority: opportunityData.priority || 'medium',
              nextActionDue: opportunityData.next_action_due || undefined
            }
          );
        }
      }

      setOpportunityData({
        organisation_name: '',
        contact_person: '',
        stage: 'identified',
        next_action: '',
        notes: '',
        asset_id: '',
        exploitation_type: '' as ExploitationType,
        priority: 'medium',
        next_action_due: ''
      });
      setEditingId(null);
      setShowOpportunityForm(false);
      loadOpportunities();
    } catch (error: any) {
      console.error('[Exploitation] Error saving opportunity:', error);
      alert('Failed to save opportunity. Please try again.');
    }
  }

  async function handleAgreementSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      console.log('[Exploitation] Creating agreement');

      const { error } = await supabase
        .from('agreement_records')
        .insert({
          ...agreementData,
          project_id: currentProject!.id,
          opportunity_id: agreementData.opportunity_id || null,
          agreement_date: agreementData.agreement_date || null,
          file_url: agreementData.file_url || null,
          notes: agreementData.notes || null
        });

      if (error) throw error;

      setAgreementData({
        opportunity_id: '',
        type: 'license',
        title: '',
        status: 'draft',
        agreement_date: '',
        notes: '',
        file_url: ''
      });
      setShowAgreementForm(false);
      loadAgreements();
    } catch (error: any) {
      console.error('[Exploitation] Error creating agreement:', error);
      alert('Failed to create agreement. Please try again.');
    }
  }

  async function handleDelete(id: string, type: 'opportunity' | 'agreement') {
    const ok = await confirm({ title: `Delete ${type}?`, message: `This ${type} will be permanently removed. This cannot be undone.` });
    if (ok) {
      try {
        const { error } = await supabase
          .from(type === 'opportunity' ? 'uptake_opportunities' : 'agreement_records')
          .delete()
          .eq('id', id);

        if (error) throw error;

        if (type === 'opportunity') loadOpportunities();
        else loadAgreements();
      } catch (error: any) {
        console.error(`[Exploitation] Error deleting ${type}:`, error);
        alert(`Failed to delete ${type}`);
      }
    }
  }

  async function handleStageChange(id: string, newStage: string) {
    try {
      console.log('[Exploitation] Updating stage');
      const { error } = await supabase
        .from('uptake_opportunities')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      loadOpportunities();
    } catch (error: any) {
      console.error('[Exploitation] Error updating stage:', error);
      alert('Failed to update stage');
    }
  }

  function handleEditOpportunity(opp: any) {
    // Load metadata from local store
    let meta: any = {};
    if (currentOrganisation && currentProject) {
      meta = ExploitationMetadataStore.getMetadata(
        currentOrganisation.id, currentProject.id, opp.id
      ) || {};
    }

    setOpportunityData({
      organisation_name: opp.organisation_name,
      contact_person: opp.contact_person || '',
      stage: opp.stage,
      next_action: opp.next_action || '',
      notes: opp.notes || '',
      asset_id: opp.asset_id || '',
      exploitation_type: (meta.exploitationType || '') as ExploitationType,
      priority: meta.priority || 'medium',
      next_action_due: meta.nextActionDue || ''
    });
    setEditingId(opp.id);
    setShowOpportunityForm(true);
  }

  // --- Bulk actions ---
  function toggleSelectAll() {
    if (selectedIds.size === filteredOpportunities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOpportunities.map(o => o.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleBulkStageChange(newStage: string) {
    if (selectedIds.size === 0 || !newStage) return;
    const ok1 = await confirm({ title: 'Move opportunities?', message: `Move ${selectedIds.size} opportunities to "${newStage}"?`, variant: 'info', confirmLabel: 'Move' });
    if (!ok1) return;

    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('uptake_opportunities')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      setSelectedIds(new Set());
      setBulkStageTarget('');
      setShowBulkStageDropdown(false);
      loadOpportunities();
    } catch (error: any) {
      console.error('[Exploitation] Bulk stage change error:', error);
      alert('Failed to update opportunities');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const ok2 = await confirm({ title: 'Delete opportunities?', message: `Delete ${selectedIds.size} opportunities? This cannot be undone.` });
    if (!ok2) return;

    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('uptake_opportunities')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setSelectedIds(new Set());
      loadOpportunities();
    } catch (error: any) {
      console.error('[Exploitation] Bulk delete error:', error);
      alert('Failed to delete opportunities');
    }
  }

  function handleCreateAgreementForOpportunity(opportunityId: string) {
    const opp = opportunities.find(o => o.id === opportunityId);
    setAgreementData({
      ...agreementData,
      opportunity_id: opportunityId,
      title: opp ? `Agreement with ${opp.organisation_name}` : ''
    });
    setShowAgreementForm(true);
  }

  const filteredOpportunities = opportunities.filter(o =>
    o.organisation_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!stageFilter || o.stage === stageFilter)
  );

  const filteredAgreements = agreements.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stages = ['identified', 'engaged', 'negotiating', 'agreed', 'implemented', 'closed'];
  const stageColors: Record<string, string> = {
    identified: 'bg-slate-100 text-slate-700',
    engaged: 'bg-blue-100 text-blue-700',
    negotiating: 'bg-yellow-100 text-yellow-700',
    agreed: 'bg-green-100 text-green-700',
    implemented: 'bg-teal-100 text-teal-700',
    closed: 'bg-slate-200 text-slate-600'
  };

  const assetsWithoutExploitation = assets.filter(asset => {
    return !opportunities.some(opp => opp.asset_id === asset.id);
  });

  function getOppMeta(oppId: string) {
    if (!currentOrganisation || !currentProject) return null;
    return ExploitationMetadataStore.getMetadata(
      currentOrganisation.id, currentProject.id, oppId
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Select a project to view exploitation pipeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Exploitation & Uptake Pipeline"
        subtitle="Track opportunities from identification to implementation"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOpportunityForm(true)}
              className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Opportunity
            </button>
            <button
              onClick={() => setShowAgreementForm(true)}
              className="flex items-center gap-2 border border-slate-300 text-[#14261C] px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              Agreement
            </button>
            <ExploitationExport
              opportunities={opportunities}
              agreements={agreements}
            />
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 border border-slate-300 text-[#14261C] px-4 py-2.5 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              title="Exploitation Strategy Wizard"
            >
              <Wand2 className="h-4 w-4" />
              Wizard
            </button>
          </div>
        }
      />

      {/* Dashboard Summary */}
      <UptakeDashboard
        opportunities={opportunities}
        agreements={agreements}
        projectId={currentProject.id}
      />

      <div className="flex gap-2 border-b border-slate-200">
        {(['board', 'queue', 'opportunities', 'agreements'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        {assetsWithoutExploitation.length > 0 && (
          <button
            onClick={() => setActiveTab('assets')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'assets'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assets to Exploit
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
              {assetsWithoutExploitation.length}
            </span>
          </button>
        )}
      </div>

      {(activeTab === 'opportunities' || activeTab === 'agreements') && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            {activeTab === 'opportunities' && (
              <>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">All Stages</option>
                  {stages.map(s => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <PipelineBoard
          opportunities={opportunities}
          agreements={agreements}
          onOpenOpportunity={setSelectedOpportunityId}
          onStageChange={handleStageChange}
          onCreateAgreement={handleCreateAgreementForOpportunity}
        />
      )}

      {activeTab === 'queue' && (
        <WorkQueue
          opportunities={opportunities}
          agreements={agreements}
          onOpenOpportunity={setSelectedOpportunityId}
          onRefresh={loadOpportunities}
        />
      )}

      {activeTab === 'opportunities' && (
        <div className="bg-white rounded-lg shadow border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Opportunities List</h2>
              {filteredOpportunities.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                >
                  {selectedIds.size === filteredOpportunities.length ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {selectedIds.size === filteredOpportunities.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowBulkStageDropdown(!showBulkStageDropdown)}
                    className="text-sm px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                  >
                    Change Stage
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showBulkStageDropdown && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                      {stages.map(s => (
                        <button
                          key={s}
                          onClick={() => handleBulkStageChange(s)}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleBulkDelete}
                  className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => { setSelectedIds(new Set()); setShowBulkStageDropdown(false); }}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {filteredOpportunities.length === 0 ? (
            <div className="p-6 text-center text-slate-600">
              <Target className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              No opportunities found
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredOpportunities.map(opp => {
                const meta = getOppMeta(opp.id);
                const typeInfo = meta?.exploitationType
                  ? EXPLOITATION_TYPES.find(t => t.value === meta.exploitationType)
                  : null;
                const priorityColors: Record<string, string> = {
                  high: 'bg-red-100 text-red-700',
                  medium: 'bg-blue-100 text-blue-700',
                  low: 'bg-slate-100 text-slate-600'
                };
                const isSelected = selectedIds.has(opp.id);

                return (
                <div
                  key={opp.id}
                  className={`p-6 hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                  onClick={() => setSelectedOpportunityId(opp.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(opp.id);
                        }}
                        className="mt-1 flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-slate-900">{opp.organisation_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${stageColors[opp.stage]}`}>
                            {opp.stage}
                          </span>
                          {typeInfo && (
                            <span className={`text-xs px-2 py-0.5 rounded ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          )}
                          {meta?.priority && meta.priority !== 'medium' && (
                            <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[meta.priority]}`}>
                              {meta.priority === 'high' ? '\u2b06 High' : '\u2b07 Low'}
                            </span>
                          )}
                          {!opp.owner_user_id && (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              Unassigned
                            </span>
                          )}
                        </div>
                        {opp.contact_person && (
                          <p className="text-sm text-slate-600">Contact: {opp.contact_person}</p>
                        )}
                        {opp.next_action && (
                          <p className="text-sm text-slate-700 mt-1">{opp.next_action}</p>
                        )}
                        {meta?.nextActionDue && (
                          <p className="text-xs text-slate-500 mt-1">
                            Due: {new Date(meta.nextActionDue).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditOpportunity(opp);
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(opp.id, 'opportunity');
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'agreements' && (
        <div className="bg-white rounded-lg shadow border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Agreement Records</h2>
          </div>
          {filteredAgreements.length === 0 ? (
            <div className="p-6 text-center text-slate-600">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              No agreements found
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredAgreements.map(agr => {
                const opp = opportunities.find(o => o.id === agr.opportunity_id);
                return (
                  <div key={agr.id} className="p-6 hover:bg-slate-50 flex justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="h-5 w-5 text-slate-400 mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{agr.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                            {agr.type}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            {agr.status}
                          </span>
                        </div>
                        {opp && (
                          <p className="text-sm text-slate-600">Opportunity: {opp.organisation_name}</p>
                        )}
                        {agr.agreement_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            Date: {new Date(agr.agreement_date).toLocaleDateString()}
                          </p>
                        )}
                        {agr.notes && (
                          <p className="text-sm text-slate-600 mt-1">{agr.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(agr.id, 'agreement')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="bg-white rounded-lg shadow border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Assets Without Exploitation Pathway</h2>
            <p className="text-sm text-slate-600 mt-1">
              These assets have no linked opportunities. Consider creating an exploitation opportunity.
            </p>
          </div>
          {assetsWithoutExploitation.length === 0 ? (
            <div className="p-6 text-center text-slate-600">All assets have exploitation pathways</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {assetsWithoutExploitation.map(asset => (
                <div key={asset.id} className="p-6 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-medium text-slate-900">{asset.title}</div>
                    <div className="text-xs text-slate-500">{asset.type}</div>
                  </div>
                  <button
                    onClick={() => {
                      setOpportunityData({
                        ...opportunityData,
                        asset_id: asset.id
                      });
                      setShowOpportunityForm(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Create Opportunity
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showOpportunityForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit' : 'New'} Opportunity
              </h3>
              <button
                onClick={() => {
                  setShowOpportunityForm(false);
                  setEditingId(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleOpportunitySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organisation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={opportunityData.organisation_name}
                  onChange={(e) => setOpportunityData({ ...opportunityData, organisation_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person</label>
                <input
                  type="text"
                  value={opportunityData.contact_person}
                  onChange={(e) => setOpportunityData({ ...opportunityData, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stage</label>
                  <select
                    value={opportunityData.stage}
                    onChange={(e) => setOpportunityData({ ...opportunityData, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {stages.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Link Asset (Optional)</label>
                  <select
                    value={opportunityData.asset_id}
                    onChange={(e) => setOpportunityData({ ...opportunityData, asset_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">No asset</option>
                    {assets.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Exploitation Type</label>
                  <select
                    value={opportunityData.exploitation_type}
                    onChange={(e) => setOpportunityData({ ...opportunityData, exploitation_type: e.target.value as ExploitationType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Not specified</option>
                    {EXPLOITATION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={opportunityData.priority}
                    onChange={(e) => setOpportunityData({ ...opportunityData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Next Action</label>
                <textarea
                  value={opportunityData.next_action}
                  onChange={(e) => setOpportunityData({ ...opportunityData, next_action: e.target.value })}
                  rows={2}
                  placeholder="What needs to happen next?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Next Action Due Date</label>
                <input
                  type="date"
                  value={opportunityData.next_action_due}
                  onChange={(e) => setOpportunityData({ ...opportunityData, next_action_due: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={opportunityData.notes}
                  onChange={(e) => setOpportunityData({ ...opportunityData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingId ? 'Update' : 'Create'} Opportunity
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOpportunityForm(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAgreementForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">New Agreement</h3>
              <button
                onClick={() => setShowAgreementForm(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAgreementSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={agreementData.title}
                  onChange={(e) => setAgreementData({ ...agreementData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Opportunity (Optional)</label>
                <select
                  value={agreementData.opportunity_id}
                  onChange={(e) => setAgreementData({ ...agreementData, opportunity_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">No opportunity</option>
                  {opportunities.map(o => (
                    <option key={o.id} value={o.id}>{o.organisation_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <select
                    value={agreementData.type}
                    onChange={(e) => setAgreementData({ ...agreementData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="license">License</option>
                    <option value="mou">MOU</option>
                    <option value="contract">Contract</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={agreementData.status}
                    onChange={(e) => setAgreementData({ ...agreementData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="draft">Draft</option>
                    <option value="review">Under Review</option>
                    <option value="signed">Signed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Agreement Date</label>
                <input
                  type="date"
                  value={agreementData.agreement_date}
                  onChange={(e) => setAgreementData({ ...agreementData, agreement_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">File URL</label>
                <input
                  type="url"
                  value={agreementData.file_url}
                  onChange={(e) => setAgreementData({ ...agreementData, file_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={agreementData.notes}
                  onChange={(e) => setAgreementData({ ...agreementData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Agreement
                </button>
                <button
                  type="button"
                  onClick={() => setShowAgreementForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <OpportunityDrawer
        opportunityId={selectedOpportunityId}
        onClose={() => setSelectedOpportunityId(null)}
        onUpdated={loadData}
      />

      {showWizard && (
        <ExploitationWizard
          assets={assets}
          opportunities={opportunities}
          onClose={() => setShowWizard(false)}
          onComplete={() => {
            setShowWizard(false);
            loadData();
          }}
        />
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
