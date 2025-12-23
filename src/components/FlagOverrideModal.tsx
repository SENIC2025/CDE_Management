import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { logAuditEvent } from '../lib/audit';
import { FlagOverride } from '../lib/decisionSupportTypes';
import { X, AlertCircle, Check, Ban, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface FlagOverrideModalProps {
  flagCode: string;
  entityType: string;
  entityId: string;
  currentOverride?: FlagOverride;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', icon: AlertCircle, color: 'text-red-600' },
  { value: 'acknowledged', label: 'Acknowledged', icon: Check, color: 'text-blue-600' },
  { value: 'not_applicable', label: 'Not Applicable', icon: Ban, color: 'text-slate-600' },
  { value: 'false_positive', label: 'False Positive', icon: XCircle, color: 'text-orange-600' },
  { value: 'resolved', label: 'Resolved', icon: Check, color: 'text-green-600' },
];

export default function FlagOverrideModal({
  flagCode,
  entityType,
  entityId,
  currentOverride,
  onClose,
  onSaved,
}: FlagOverrideModalProps) {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const [status, setStatus] = useState<string>(currentOverride?.status || 'acknowledged');
  const [rationale, setRationale] = useState<string>(currentOverride?.rationale || '');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FlagOverride[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const canOverride = permissions.isCDELead() || permissions.isCoordinator() || permissions.isAdmin();

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    if (!currentProject) return;

    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('decision_flag_overrides')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('flag_code', flagCode)
        .order('created_at', { ascending: false });

      if (data) {
        setHistory(data);
      }
    } catch (error) {
      console.error('Error loading override history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSave() {
    if (!currentProject || !profile) return;
    if (!rationale.trim()) {
      alert('Please provide a rationale for this override');
      return;
    }

    setSaving(true);
    try {
      const overrideData = {
        project_id: currentProject.id,
        entity_type: entityType,
        entity_id: entityId,
        flag_code: flagCode,
        status,
        rationale: rationale.trim(),
        created_by: profile.id,
        updated_by: profile.id,
      };

      if (currentOverride) {
        const { error } = await supabase
          .from('decision_flag_overrides')
          .update({
            status,
            rationale: rationale.trim(),
            updated_by: profile.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentOverride.id);

        if (error) throw error;

        await logAuditEvent(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'flag_override',
          currentOverride.id,
          'update',
          currentOverride,
          { status, rationale }
        );
      } else {
        const { data, error } = await supabase
          .from('decision_flag_overrides')
          .insert(overrideData)
          .select()
          .single();

        if (error) throw error;

        await logAuditEvent(
          currentProject.org_id,
          currentProject.id,
          profile.id,
          'flag_override',
          data.id,
          'create',
          undefined,
          data
        );
      }

      onSaved();
    } catch (error) {
      console.error('Error saving override:', error);
      alert('Failed to save override');
    } finally {
      setSaving(false);
    }
  }

  if (!canOverride) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold">Permission Denied</h3>
            </div>
            <p className="text-slate-600 mb-4">
              Only CDE Lead, Coordinator, or Admin roles can override recommendation flags.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Flag Override</h3>
            <p className="text-sm text-slate-600 mt-1">
              {currentOverride ? 'Update' : 'Create'} override for flag: {flagCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setStatus(option.value)}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg transition ${
                      status === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={18} className={option.color} />
                    <span className="text-sm font-medium text-slate-900">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Rationale <span className="text-red-600">*</span>
            </label>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              rows={4}
              placeholder="Explain why you are overriding this flag..."
              className="w-full px-3 py-2 border rounded-md"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              This rationale will be logged in the audit trail for transparency.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !rationale.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400"
            >
              {saving ? 'Saving...' : currentOverride ? 'Update Override' : 'Create Override'}
            </button>
            <button
              onClick={onClose}
              className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300"
            >
              Cancel
            </button>
          </div>

          {history.length > 0 && (
            <div className="border-t pt-6">
              <h4 className="text-base font-semibold text-slate-900 mb-3">Override History</h4>
              {loadingHistory ? (
                <div className="text-center text-slate-600 py-4">Loading history...</div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {history.map((override) => {
                    const statusOption = STATUS_OPTIONS.find((opt) => opt.value === override.status);
                    const Icon = statusOption?.icon || Clock;
                    return (
                      <div key={override.id} className="border rounded-lg p-3 bg-slate-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon size={16} className={statusOption?.color || 'text-slate-600'} />
                            <span className="text-sm font-semibold text-slate-900">
                              {statusOption?.label || override.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(override.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{override.rationale}</p>
                        {override.updated_at !== override.created_at && (
                          <p className="text-xs text-slate-500">
                            Updated: {new Date(override.updated_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
