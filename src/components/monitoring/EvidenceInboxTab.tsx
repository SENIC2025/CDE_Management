import { useState, useMemo } from 'react';
import { FileText, Link as LinkIcon, ExternalLink, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  evidence_date: string;
  source_url?: string;
  file_url?: string;
  created_at: string;
}

interface EvidenceLink {
  evidence_item_id: string;
  indicator_id?: string;
  activity_id?: string;
}

interface Indicator {
  id: string;
  name: string;
}

interface EvidenceInboxTabProps {
  projectId: string;
  evidenceItems: EvidenceItem[];
  evidenceLinks: EvidenceLink[];
  indicators: Indicator[];
  onRefresh: () => void;
}

export default function EvidenceInboxTab({
  projectId,
  evidenceItems,
  evidenceLinks,
  indicators,
  onRefresh
}: EvidenceInboxTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [onlyUnlinked, setOnlyUnlinked] = useState(true);
  const [linkingEvidenceId, setLinkingEvidenceId] = useState<string | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [suppressedIds, setSuppressedIds] = useState<Set<string>>(new Set());

  const linkedEvidenceIds = useMemo(() => {
    return new Set(evidenceLinks.map(link => link.evidence_item_id));
  }, [evidenceLinks]);

  const filteredEvidence = useMemo(() => {
    return evidenceItems.filter(item => {
      if (suppressedIds.has(item.id)) return false;

      if (onlyUnlinked && linkedEvidenceIds.has(item.id)) return false;

      if (typeFilter !== 'all' && item.type !== typeFilter) return false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [evidenceItems, onlyUnlinked, typeFilter, searchTerm, linkedEvidenceIds, suppressedIds]);

  const getLinkCount = (evidenceId: string) => {
    return evidenceLinks.filter(link => link.evidence_item_id === evidenceId).length;
  };

  const handleLinkToIndicators = async () => {
    if (!linkingEvidenceId || selectedIndicators.length === 0) return;

    try {
      const linksToInsert = selectedIndicators.map(indicatorId => ({
        evidence_item_id: linkingEvidenceId,
        indicator_id: indicatorId
      }));

      const { error } = await supabase
        .from('evidence_links')
        .insert(linksToInsert);

      if (error) throw error;

      console.log('[EvidenceInbox] Linked evidence to indicators');
      setLinkingEvidenceId(null);
      setSelectedIndicators([]);
      onRefresh();
    } catch (err: any) {
      console.error('[EvidenceInbox] Error linking evidence:', err);
      alert('Failed to link evidence: ' + err.message);
    }
  };

  const handleSuppressEvidence = (evidenceId: string) => {
    const stored = localStorage.getItem(`evidence_inbox_suppressed_${projectId}`);
    const existing = stored ? JSON.parse(stored) : [];
    const updated = [...existing, evidenceId];
    localStorage.setItem(`evidence_inbox_suppressed_${projectId}`, JSON.stringify(updated));
    setSuppressedIds(new Set(updated));
  };

  const getTypeIcon = (type: string) => {
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  const uniqueTypes = Array.from(new Set(evidenceItems.map(item => item.type)));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <label className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={onlyUnlinked}
              onChange={(e) => setOnlyUnlinked(e.target.checked)}
              className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Unlinked only</span>
          </label>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Evidence Inbox</h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredEvidence.length} evidence item{filteredEvidence.length !== 1 ? 's' : ''} need{filteredEvidence.length === 1 ? 's' : ''} attention
            </p>
          </div>
        </div>
      </div>

      {filteredEvidence.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">
            {onlyUnlinked ? 'No unlinked evidence items' : 'No evidence items match your filters'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidence.map(item => {
            const linkCount = getLinkCount(item.id);
            return (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3 mb-3">
                  {getTypeIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{item.type}</span>
                      {linkCount > 0 ? (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          {linkCount} link{linkCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">Unlinked</span>
                      )}
                    </div>
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                )}

                <div className="text-xs text-gray-500 mb-3">
                  {new Date(item.evidence_date).toLocaleDateString()}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setLinkingEvidenceId(item.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Link</span>
                  </button>

                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View</span>
                    </a>
                  )}

                  <button
                    onClick={() => handleSuppressEvidence(item.id)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Not needed
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {linkingEvidenceId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Link Evidence to Indicators</h3>
              <button
                onClick={() => {
                  setLinkingEvidenceId(null);
                  setSelectedIndicators([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <div className="font-medium text-gray-900">
                  {evidenceItems.find(e => e.id === linkingEvidenceId)?.title}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Select indicators to link this evidence to
                </div>
              </div>

              <div className="space-y-2">
                {indicators.map(indicator => (
                  <label
                    key={indicator.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndicators.includes(indicator.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIndicators([...selectedIndicators, indicator.id]);
                        } else {
                          setSelectedIndicators(selectedIndicators.filter(id => id !== indicator.id));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{indicator.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  setLinkingEvidenceId(null);
                  setSelectedIndicators([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkToIndicators}
                disabled={selectedIndicators.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Link to {selectedIndicators.length} Indicator{selectedIndicators.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
