import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Globe, Share2, Mail, CalendarDays, Newspaper } from 'lucide-react';

interface AddChannelModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

const typeOptions = [
  { value: 'website', label: 'Website', icon: Globe, description: 'Project website, landing pages, blogs' },
  { value: 'social', label: 'Social Media', icon: Share2, description: 'Twitter/X, LinkedIn, Facebook, Instagram' },
  { value: 'newsletter', label: 'Newsletter', icon: Mail, description: 'Email newsletters, mailing lists' },
  { value: 'event', label: 'Event', icon: CalendarDays, description: 'Conferences, workshops, webinars' },
  { value: 'press', label: 'Press', icon: Newspaper, description: 'Press releases, media coverage' },
];

export default function AddChannelModal({ projectId, onClose, onCreated }: AddChannelModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('website');
  const [description, setDescription] = useState('');
  const [audienceFitScore, setAudienceFitScore] = useState(5);
  const [costNotes, setCostNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('channels').insert({
        project_id: projectId,
        name: name.trim(),
        type,
        description: description.trim() || null,
        audience_fit_score: audienceFitScore,
        cost_notes: costNotes.trim() || null,
      });
      if (insertError) throw insertError;
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('[AddChannel] Error:', err);
      setError(err.message || 'Failed to create channel');
    } finally {
      setSaving(false);
    }
  }

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
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">New Channel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Channel Type Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Channel Type *</label>
            <div className="grid grid-cols-5 gap-2">
              {typeOptions.map(opt => {
                const Icon = opt.icon;
                const selected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selected ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${selected ? 'text-blue-700' : 'text-gray-600'}`}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {typeOptions.find(o => o.value === type)?.description}
            </p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Project LinkedIn Page"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of this channel and its purpose..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Audience Fit Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience Fit Score: <span className={`font-bold ${getFitColor(audienceFitScore)}`}>{audienceFitScore}/10 — {getFitLabel(audienceFitScore)}</span>
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
              placeholder="Any notes about costs, subscriptions, or effort involved..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Channel'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
