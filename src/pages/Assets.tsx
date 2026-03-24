import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Package, Search, AlertCircle, RefreshCw } from 'lucide-react';
import AssetCard, { type ResultAsset } from '../components/assets/AssetCard';
import AddAssetModal from '../components/assets/AddAssetModal';
import AssetEditPanel from '../components/assets/AssetEditPanel';
import EvidencePicker from '../components/EvidencePicker';
import { PageHeader, PageSkeleton, ConfirmDialog, CopyLinkButton, ShareButton } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import useDeepLink from '../hooks/useDeepLink';

export default function Assets() {
  const { currentProject } = useProject();
  const [confirmProps, confirm] = useConfirm();
  const [assets, setAssets] = useState<ResultAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMaturity, setFilterMaturity] = useState('all');
  const [filterExploitation, setFilterExploitation] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ResultAsset | null>(null);

  // Deep link support: ?view=<assetId>
  const { openItem, closeItem, copyDeepLink } = useDeepLink({
    items: assets,
    onOpen: setEditingAsset,
    onClose: () => setEditingAsset(null),
    loading,
  });

  const [showEvidence, setShowEvidence] = useState<string | null>(null);
  const [linkedEvidence, setLinkedEvidence] = useState<string[]>([]);
  const [objectiveTitles, setObjectiveTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentProject) {
      loadAssets();
      loadObjectiveTitles();
    }
  }, [currentProject]);

  async function loadAssets() {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('result_assets')
        .select('*')
        .eq('project_id', currentProject!.id)
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setAssets(data || []);
    } catch (err: any) {
      console.error('[Assets] Error loading:', err);
      setError(err.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }

  async function loadObjectiveTitles() {
    const { data } = await supabase
      .from('project_objectives')
      .select('id, title')
      .eq('project_id', currentProject!.id);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(o => { map[o.id] = o.title; });
      setObjectiveTitles(map);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: 'Delete asset?', message: 'This asset will be permanently removed. This cannot be undone.' });
    if (!ok) return;
    const { error } = await supabase.from('result_assets').delete().eq('id', id);
    if (!error) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  }

  async function handleExploitationChange(assetId: string, newStatus: string) {
    const { error } = await supabase
      .from('result_assets')
      .update({ exploitation_status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', assetId);
    if (!error) {
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, exploitation_status: newStatus } : a));
    }
  }

  async function loadLinkedEvidence(assetId: string) {
    const { data } = await supabase.from('evidence_links').select('evidence_item_id').eq('asset_id', assetId);
    setLinkedEvidence(data?.map(d => d.evidence_item_id) || []);
    setShowEvidence(assetId);
  }

  // Filters
  const filtered = assets.filter(a => {
    const matchesSearch = !searchTerm ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.responsible_partner || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || a.type === filterType;
    const matchesMaturity = filterMaturity === 'all' || a.maturity_level === filterMaturity;
    const matchesExploitation = filterExploitation === 'all' || a.exploitation_status === filterExploitation;
    return matchesSearch && matchesType && matchesMaturity && matchesExploitation;
  });

  // Stats
  const total = assets.length;
  const matureCount = assets.filter(a => a.maturity_level === 'mature').length;
  const exploitedCount = assets.filter(a => a.exploitation_status === 'being_exploited' || a.exploitation_status === 'adopted').length;
  const openAccessCount = assets.filter(a => a.access_modality === 'open').length;

  // Type breakdown
  const typeCounts: Record<string, number> = {};
  assets.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; });

  const typeColors: Record<string, string> = {
    publication: 'bg-blue-500',
    software: 'bg-violet-500',
    dataset: 'bg-emerald-500',
    method: 'bg-amber-500',
    training: 'bg-pink-500',
  };
  const typeLabels: Record<string, string> = {
    publication: 'Publications',
    software: 'Software',
    dataset: 'Datasets',
    method: 'Methods',
    training: 'Training',
  };

  // Maturity breakdown
  const maturityCounts: Record<string, number> = {};
  assets.forEach(a => { maturityCounts[a.maturity_level] = (maturityCounts[a.maturity_level] || 0) + 1; });

  const maturityColors: Record<string, string> = {
    concept: 'bg-gray-400',
    prototype: 'bg-blue-400',
    tested: 'bg-yellow-400',
    mature: 'bg-emerald-500',
  };
  const maturityLabels: Record<string, string> = {
    concept: 'Concept',
    prototype: 'Prototype',
    tested: 'Tested',
    mature: 'Mature',
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Select a project to manage assets</p>
      </div>
    );
  }

  if (loading && assets.length === 0) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Results & Exploitable Assets"
        subtitle="Track project results, maturity progression, and exploitation pathways"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#1BAE70] text-white px-4 py-2.5 rounded-lg hover:bg-[#06752E] font-medium transition-colors"
          >
            <Plus size={18} />
            Add Asset
          </button>
        }
      />

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Assets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Mature</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{matureCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Being Exploited / Adopted</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{exploitedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Open Access</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{openAccessCount}</p>
        </div>
      </div>

      {/* Type Breakdown Bar */}
      {total > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Type Distribution</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div
                key={type}
                className={`${typeColors[type] || 'bg-gray-400'}`}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${typeLabels[type] || type}: ${count}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className={`w-2.5 h-2.5 rounded-full ${typeColors[type] || 'bg-gray-400'}`} />
                <span>{typeLabels[type] || type}: {count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maturity Breakdown Bar */}
      {total > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Maturity Distribution</span>
          </div>
          <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
            {['concept', 'prototype', 'tested', 'mature'].map(level => {
              const count = maturityCounts[level] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={level}
                  className={maturityColors[level]}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${maturityLabels[level]}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {['concept', 'prototype', 'tested', 'mature'].map(level => {
              const count = maturityCounts[level] || 0;
              if (count === 0) return null;
              return (
                <div key={level} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className={`w-2.5 h-2.5 rounded-full ${maturityColors[level]}`} />
                  <span>{maturityLabels[level]}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Types</option>
            <option value="publication">Publication</option>
            <option value="software">Software</option>
            <option value="dataset">Dataset</option>
            <option value="method">Method</option>
            <option value="training">Training</option>
          </select>
          <select
            value={filterMaturity}
            onChange={(e) => setFilterMaturity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Maturity Levels</option>
            <option value="concept">Concept</option>
            <option value="prototype">Prototype</option>
            <option value="tested">Tested</option>
            <option value="mature">Mature</option>
          </select>
          <select
            value={filterExploitation}
            onChange={(e) => setFilterExploitation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">All Exploitation Status</option>
            <option value="identified">Identified</option>
            <option value="under_assessment">Under Assessment</option>
            <option value="being_exploited">Being Exploited</option>
            <option value="adopted">Adopted</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
          <button onClick={loadAssets} className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading assets...</p>
        </div>
      )}

      {/* Asset Cards */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {assets.length === 0 ? 'No assets yet' : 'No matching assets'}
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            {assets.length === 0
              ? 'Start by adding your project results — publications, software, datasets, methods, or training materials. Track their maturity and exploitation journey.'
              : 'Try adjusting your search or filters to find what you are looking for.'}
          </p>
          {assets.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Asset
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              objectiveTitles={objectiveTitles}
              onEdit={() => openItem(asset)}
              onDelete={() => handleDelete(asset.id)}
              onViewEvidence={() => loadLinkedEvidence(asset.id)}
              onExploitationChange={(newStatus) => handleExploitationChange(asset.id, newStatus)}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddAssetModal
          projectId={currentProject.id}
          onClose={() => setShowAddModal(false)}
          onCreated={loadAssets}
        />
      )}

      {/* Edit Panel */}
      {editingAsset && (
        <AssetEditPanel
          projectId={currentProject.id}
          asset={editingAsset}
          onClose={closeItem}
          onUpdate={() => { closeItem(); loadAssets(); }}
          deepLinkActions={
            <div className="flex items-center gap-2">
              <CopyLinkButton itemId={editingAsset.id} onCopy={copyDeepLink} />
              <ShareButton
                entityType="asset"
                entityId={editingAsset.id}
                projectId={currentProject.id}
                entityTitle={editingAsset.title}
              />
            </div>
          }
        />
      )}

      {/* Evidence Picker Modal */}
      {showEvidence && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Evidence for Asset</h3>
              <button
                onClick={() => setShowEvidence(null)}
                className="text-gray-400 hover:text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <EvidencePicker
                linkedEvidenceIds={linkedEvidence}
                onLink={(id) => setLinkedEvidence([...linkedEvidence, id])}
                onUnlink={(id) => setLinkedEvidence(linkedEvidence.filter(e => e !== id))}
                entityType="asset"
                entityId={showEvidence}
              />
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
