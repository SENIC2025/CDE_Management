import { useState, useEffect } from 'react';
import { X, Package, ChevronRight, Check, Plus, TrendingUp, BookOpen, Target, Library, ArrowLeft } from 'lucide-react';
import { indicatorLibraryService, IndicatorBundle, IndicatorBundleItem } from '../../lib/indicatorLibraryService';

interface BundlePickerModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onApplied?: (result: { inserted: number; skipped: number; bundleName: string }) => void;
}

const BUNDLE_TYPE_LABELS: Record<string, string> = {
  segment: 'By Target Audience',
  purpose: 'By Purpose',
  domain: 'By CDE Domain',
  maturity: 'By Maturity Level',
};

const COLOR_MAP: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  amber: 'from-amber-500 to-amber-600',
  green: 'from-green-500 to-green-600',
  emerald: 'from-emerald-500 to-emerald-600',
  rose: 'from-rose-500 to-rose-600',
  cyan: 'from-cyan-500 to-cyan-600',
  sky: 'from-sky-500 to-sky-600',
  orange: 'from-orange-500 to-orange-600',
};

const COLOR_BG_MAP: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 hover:border-blue-400',
  purple: 'bg-purple-50 border-purple-200 hover:border-purple-400',
  amber: 'bg-amber-50 border-amber-200 hover:border-amber-400',
  green: 'bg-green-50 border-green-200 hover:border-green-400',
  emerald: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
  rose: 'bg-rose-50 border-rose-200 hover:border-rose-400',
  cyan: 'bg-cyan-50 border-cyan-200 hover:border-cyan-400',
  sky: 'bg-sky-50 border-sky-200 hover:border-sky-400',
  orange: 'bg-orange-50 border-orange-200 hover:border-orange-400',
};

function getDomainColor(domain: string) {
  switch (domain) {
    case 'communication': return 'bg-blue-100 text-blue-700';
    case 'dissemination': return 'bg-green-100 text-green-700';
    case 'exploitation': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getDomainIcon(domain: string) {
  switch (domain) {
    case 'communication': return TrendingUp;
    case 'dissemination': return BookOpen;
    case 'exploitation': return Target;
    default: return Library;
  }
}

export default function BundlePickerModal({
  open,
  onClose,
  projectId,
  onApplied,
}: BundlePickerModalProps) {
  const [bundles, setBundles] = useState<IndicatorBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<IndicatorBundle | null>(null);
  const [detailBundle, setDetailBundle] = useState<IndicatorBundle | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (open) {
      loadBundles();
      setSelectedBundle(null);
      setDetailBundle(null);
    }
  }, [open]);

  async function loadBundles() {
    try {
      setLoading(true);
      const data = await indicatorLibraryService.listBundles();
      setBundles(data);
    } catch (error) {
      console.error('[BundlePicker] Error loading bundles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBundleDetail(bundle: IndicatorBundle) {
    try {
      setLoadingDetail(true);
      setSelectedBundle(bundle);
      const detail = await indicatorLibraryService.getBundleWithIndicators(bundle.bundle_id);
      setDetailBundle(detail);
    } catch (error) {
      console.error('[BundlePicker] Error loading bundle detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleApplyBundle() {
    if (!detailBundle) return;
    try {
      setApplying(true);
      const result = await indicatorLibraryService.addBundleToProject(projectId, detailBundle.bundle_id);

      if (result.errors.length > 0) {
        alert('Some indicators could not be added: ' + result.errors.join(', '));
      }

      if (onApplied) {
        onApplied({ ...result, bundleName: detailBundle.name });
      }
      onClose();
    } catch (error: any) {
      console.error('[BundlePicker] Error applying bundle:', error);
      alert('Failed to apply bundle. Please try again.');
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  // Group bundles by type
  const groupedBundles: Record<string, IndicatorBundle[]> = {};
  const filteredBundles = filterType === 'all' ? bundles : bundles.filter(b => b.bundle_type === filterType);
  filteredBundles.forEach(b => {
    if (!groupedBundles[b.bundle_type]) groupedBundles[b.bundle_type] = [];
    groupedBundles[b.bundle_type].push(b);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-blue-50">
          <div className="flex items-center gap-3">
            {selectedBundle && (
              <button
                onClick={() => { setSelectedBundle(null); setDetailBundle(null); }}
                className="p-1.5 hover:bg-white rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                {selectedBundle ? selectedBundle.name : 'Indicator Bundles'}
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                {selectedBundle
                  ? selectedBundle.description
                  : 'Curated indicator packages — add a complete set with one click'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Bundle List View */}
        {!selectedBundle && (
          <>
            {/* Filter pills */}
            <div className="px-6 py-3 border-b bg-slate-50 flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All Bundles' },
                { value: 'purpose', label: 'By Purpose' },
                { value: 'segment', label: 'By Audience' },
                { value: 'domain', label: 'By Domain' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    filterType === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-600">Loading bundles...</div>
                </div>
              ) : Object.keys(groupedBundles).length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No bundles available</h3>
                  <p className="text-slate-600">Bundles will appear here once configured.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedBundles).map(([type, typeBundles]) => (
                    <div key={type}>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        {BUNDLE_TYPE_LABELS[type] || type}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {typeBundles.map(bundle => (
                          <button
                            key={bundle.bundle_id}
                            onClick={() => loadBundleDetail(bundle)}
                            className={`border-2 rounded-xl p-5 text-left transition-all hover:shadow-md ${
                              COLOR_BG_MAP[bundle.color || 'blue'] || COLOR_BG_MAP.blue
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{bundle.icon || '📦'}</span>
                                <div>
                                  <h4 className="font-semibold text-slate-900">{bundle.name}</h4>
                                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{bundle.description}</p>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Bundle Detail View */}
        {selectedBundle && (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-slate-600">Loading bundle indicators...</div>
                </div>
              ) : !detailBundle?.items || detailBundle.items.length === 0 ? (
                <div className="text-center py-12">
                  <Library className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No indicators in this bundle</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary bar */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg mb-4">
                    <span className="text-3xl">{selectedBundle.icon || '📦'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                        <span className="font-medium text-slate-900">{detailBundle.items.length} indicators</span>
                        <span>•</span>
                        <span className="text-emerald-600">{detailBundle.items.filter((i: IndicatorBundleItem) => i.indicator).length} available</span>
                        {detailBundle.items.some((i: IndicatorBundleItem) => !i.indicator) && (
                          <>
                            <span>•</span>
                            <span className="text-yellow-600">{detailBundle.items.filter((i: IndicatorBundleItem) => !i.indicator).length} pending</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{detailBundle.items.filter((i: IndicatorBundleItem) => i.is_required).length} core</span>
                        <span>•</span>
                        {(() => {
                          const allCodes = detailBundle.items.map((i: IndicatorBundleItem) => i.indicator_code);
                          const domains = new Set(allCodes.map(c => c.startsWith('COM-') ? 'communication' : c.startsWith('DIS-') ? 'dissemination' : 'exploitation'));
                          return <span>{domains.size} domain{domains.size !== 1 ? 's' : ''} covered</span>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Indicator list */}
                  {detailBundle.items.map((item: IndicatorBundleItem) => {
                    const ind = item.indicator;
                    const domain = ind?.domain || (item.indicator_code.startsWith('COM-') ? 'communication' : item.indicator_code.startsWith('DIS-') ? 'dissemination' : item.indicator_code.startsWith('EXP-') ? 'exploitation' : '');
                    const DomainIcon = getDomainIcon(domain);
                    return (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-md ${getDomainColor(domain)}`}>
                            <DomainIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono text-slate-400">{item.indicator_code}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${getDomainColor(domain)}`}>
                                {domain}
                              </span>
                              {item.is_required && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                  Core
                                </span>
                              )}
                              {ind?.maturity_level && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {ind.maturity_level}
                                </span>
                              )}
                              {!ind && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                  Pending migration
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-slate-900 text-sm">
                              {ind ? ind.name : item.indicator_code}
                            </h4>
                            {ind?.definition && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ind.definition}</p>
                            )}
                            {!ind && (
                              <p className="text-xs text-yellow-600 mt-1">
                                This indicator will be available after the SQL migration is run.
                              </p>
                            )}
                            {ind?.default_target && (
                              <div className="text-xs text-slate-500 mt-1">
                                Default target: {ind.default_target} {ind.unit}
                              </div>
                            )}
                          </div>
                          {ind ? (
                            <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-dashed border-yellow-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with apply button */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {detailBundle?.items ? (
                  <span>
                    <span className="font-medium text-slate-900">{detailBundle.items.filter((i: IndicatorBundleItem) => i.indicator).length}</span> of {detailBundle.items.length} indicators ready to add
                    {detailBundle.items.some((i: IndicatorBundleItem) => !i.indicator) && (
                      <span className="text-yellow-600 ml-1">(rest pending migration)</span>
                    )}
                  </span>
                ) : (
                  <span>Loading...</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedBundle(null); setDetailBundle(null); }}
                  disabled={applying}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleApplyBundle}
                  disabled={applying || !detailBundle?.items || detailBundle.items.length === 0}
                  className={`px-5 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-gradient-to-r ${
                    COLOR_MAP[selectedBundle.color || 'blue'] || COLOR_MAP.blue
                  } hover:opacity-90`}
                >
                  {applying ? (
                    'Adding...'
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Bundle to Project
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Footer for list view */}
        {!selectedBundle && (
          <div className="border-t border-slate-200 px-6 py-3 bg-slate-50">
            <p className="text-xs text-slate-500 text-center">
              Select a bundle to preview its indicators, then add them all to your project with one click.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
