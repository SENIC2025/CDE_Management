import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Check, Loader2, AlertCircle, Globe, Share2, Mail, CalendarDays, Newspaper } from 'lucide-react';
import type { Channel } from './ChannelCard';

interface ChannelEditPanelProps {
  channel: Channel;
  onClose: () => void;
  onUpdate: () => void;
  deepLinkActions?: React.ReactNode;
}

const typeOptions = [
  { value: 'website', label: 'Website', icon: Globe },
  { value: 'social', label: 'Social Media', icon: Share2 },
  { value: 'newsletter', label: 'Newsletter', icon: Mail },
  { value: 'event', label: 'Event', icon: CalendarDays },
  { value: 'press', label: 'Press', icon: Newspaper },
];

export default function ChannelEditPanel({ channel, onClose, onUpdate, deepLinkActions }: ChannelEditPanelProps) {
  const [name, setName] = useState(channel.name || '');
  const [type, setType] = useState(channel.type || 'website');
  const [description, setDescription] = useState(channel.description || '');
  const [audienceFitScore, setAudienceFitScore] = useState(channel.audience_fit_score || 5);
  const [costNotes, setCostNotes] = useState(channel.cost_notes || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const saveChanges = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('channels')
        .update({
          name: name.trim(),
          type,
          description: description.trim() || null,
          audience_fit_score: audienceFitScore,
          cost_notes: costNotes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', channel.id);
      if (error) throw error;
      setSaveStatus('saved');
      onUpdate();
    } catch (err) {
      console.error('[ChannelEditPanel] Save error:', err);
      setSaveStatus('error');
    }
  }, [name, type, description, audienceFitScore, costNotes]);

  // Auto-save with debounce
  useEffect(() => {
    const hasChanges =
      name !== (channel.name || '') ||
      type !== (channel.type || 'website') ||
      description !== (channel.description || '') ||
      audienceFitScore !== (channel.audience_fit_score || 5) ||
      costNotes !== (channel.cost_notes || '');

    if (!hasChanges) return;

    const timer = setTimeout(saveChanges, 1500);
    return () => clearTimeout(timer);
  }, [name, type, description, audienceFitScore, costNotes, saveChanges]);

  function getFitLabel(score: number): string {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Moderate';
    return 'Low';
  }

  function getFitColor(score: number): string {
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-gray-900/30" onClick={onClose} />
      <div className="w-[480px] bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Channel</h3>
              {deepLinkActions && <div className="mt-1">{deepLinkActions}</div>}
            </div>
            {saveStatus === 'saving' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            {saveStatus === 'saved' && <Check className="w-4 h-4 text-emerald-500" />}
            {saveStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-5 gap-2">
              {typeOptions.map(opt => {
                const Icon = opt.icon;
                const selected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-colors ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${selected ? 'text-blue-700' : 'text-gray-600'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Audience Fit Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience Fit: <span className={`font-bold ${getFitColor(audienceFitScore)}`}>{audienceFitScore}/10 — {getFitLabel(audienceFitScore)}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={audienceFitScore}
              onChange={(e) => setAudienceFitScore(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Low fit</span>
              <span>Excellent fit</span>
            </div>
          </div>

          {/* Cost Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Notes</label>
            <textarea
              value={costNotes}
              onChange={(e) => setCostNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Save Status */}
          <div className="text-xs text-gray-400 pt-2">
            {saveStatus === 'saving' && 'Saving changes...'}
            {saveStatus === 'saved' && 'All changes saved'}
            {saveStatus === 'error' && <span className="text-red-500">Failed to save — changes will retry</span>}
            {saveStatus === 'idle' && 'Changes auto-save'}
          </div>
        </div>
      </div>
    </div>
  );
}
