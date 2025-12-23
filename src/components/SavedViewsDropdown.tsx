import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Filter, Plus, X } from 'lucide-react';

interface SavedView {
  id: string;
  name: string;
  filters_json: any;
  is_default: boolean;
}

interface SavedViewsDropdownProps {
  entityType: string;
  onApplyFilters: (filters: any) => void;
}

export default function SavedViewsDropdown({ entityType, onApplyFilters }: SavedViewsDropdownProps) {
  const { currentProject } = useProject();
  const { profile } = useAuth();
  const [views, setViews] = useState<SavedView[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewViewForm, setShowNewViewForm] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  useEffect(() => {
    if (currentProject) {
      loadViews();
    }
  }, [currentProject, entityType]);

  async function loadViews() {
    const { data } = await supabase
      .from('saved_views')
      .select('*')
      .eq('project_id', currentProject!.id)
      .eq('entity_type', entityType)
      .order('is_default', { ascending: false });

    setViews(data || []);
  }

  async function createView() {
    if (!newViewName.trim() || !currentProject || !profile) return;

    await supabase.from('saved_views').insert({
      project_id: currentProject.id,
      entity_type: entityType,
      name: newViewName,
      filters_json: {},
      is_default: false,
      created_by: profile.id,
    });

    setNewViewName('');
    setShowNewViewForm(false);
    loadViews();
  }

  function applyView(view: SavedView) {
    onApplyFilters(view.filters_json);
    setShowDropdown(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-slate-50 text-sm"
      >
        <Filter size={16} />
        Saved Views
      </button>

      {showDropdown && (
        <div className="absolute z-10 mt-2 w-64 bg-white rounded-lg shadow-lg border">
          <div className="p-2 space-y-1">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => applyView(view)}
                className="w-full text-left px-3 py-2 rounded hover:bg-slate-100 text-sm"
              >
                {view.name}
                {view.is_default && (
                  <span className="ml-2 text-xs text-slate-500">(default)</span>
                )}
              </button>
            ))}
          </div>
          {!showNewViewForm ? (
            <div className="p-2 border-t">
              <button
                onClick={() => setShowNewViewForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
              >
                <Plus size={16} />
                New View
              </button>
            </div>
          ) : (
            <div className="p-3 border-t">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="View name"
                className="w-full px-2 py-1 border rounded text-sm mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={createView}
                  className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowNewViewForm(false);
                    setNewViewName('');
                  }}
                  className="px-2 py-1 border rounded text-sm hover:bg-slate-50"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
