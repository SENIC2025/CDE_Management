import { useState, useEffect } from 'react';
import { Plus, Edit, Copy, Archive, AlertCircle } from 'lucide-react';
import { templateService, type CDEStrategyTemplate } from '../lib/templateService';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import TemplateEditor from '../components/strategy/TemplateEditor';

export default function StrategyTemplates() {
  const { currentOrg } = useOrganisation();
  const { isOrgAdmin } = useEntitlements();
  const [templates, setTemplates] = useState<CDEStrategyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | undefined>();

  useEffect(() => {
    if (currentOrg?.id) {
      loadTemplates();
    }
  }, [currentOrg?.id]);

  const loadTemplates = async () => {
    if (!currentOrg?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await templateService.listTemplates(currentOrg.id);
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplateId(undefined);
    setShowEditor(true);
  };

  const handleEdit = (templateId: string) => {
    setEditingTemplateId(templateId);
    setShowEditor(true);
  };

  const handleDuplicate = async (template: CDEStrategyTemplate) => {
    if (!confirm(`Duplicate template "${template.name}"?`)) return;

    try {
      await templateService.duplicateTemplate(template.template_id, `${template.name} (Copy)`);
      loadTemplates();
    } catch (err) {
      console.error('Error duplicating template:', err);
      alert('Failed to duplicate template');
    }
  };

  const handleArchive = async (template: CDEStrategyTemplate) => {
    if (!confirm(`Archive template "${template.name}"? This will hide it from project teams.`)) return;

    try {
      await templateService.archiveTemplate(template.template_id);
      loadTemplates();
    } catch (err) {
      console.error('Error archiving template:', err);
      alert('Failed to archive template');
    }
  };

  if (showEditor) {
    return (
      <TemplateEditor
        templateId={editingTemplateId}
        onClose={() => setShowEditor(false)}
        onSave={() => {
          loadTemplates();
          setShowEditor(false);
        }}
      />
    );
  }

  if (!isOrgAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
          <p className="text-gray-600">Only organisation admins can manage strategy templates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Strategy Templates</h1>
          <p className="text-gray-600 mt-2">
            Create reusable strategy templates for your organisation's projects.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Create Template</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-500 mb-4">
            <Plus className="w-16 h-16 mx-auto mb-2 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No templates yet</h3>
            <p>Create your first strategy template to get started.</p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span>Create Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const stats = templateService.getTemplateStats(template);

            return (
              <div
                key={template.template_id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600">{template.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-4 mb-4 text-xs text-gray-500">
                  <span>{stats.objectiveCount} objectives</span>
                  <span>{stats.channelCount} channels</span>
                  <span>{stats.kpiCount} KPIs</span>
                </div>

                <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                  <span>v{template.version}</span>
                  <span>Updated {new Date(template.updated_at).toLocaleDateString()}</span>
                </div>

                {template.creator_name && (
                  <div className="text-xs text-gray-500 mb-4">
                    Created by {template.creator_name}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(template.template_id)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="flex items-center justify-center px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleArchive(template)}
                    className="flex items-center justify-center px-3 py-2 text-sm text-red-700 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
