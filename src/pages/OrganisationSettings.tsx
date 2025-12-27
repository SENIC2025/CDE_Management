import { useState } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import { Building2, Edit2, Save, X, Check } from 'lucide-react';

export default function OrganisationSettings() {
  const { organisations, currentOrg, currentOrgRole, setCurrentOrg, updateOrganisationName } = useOrganisation();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isAdmin = currentOrgRole === 'admin';

  const handleStartEdit = () => {
    setEditedName(currentOrg?.name || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName('');
  };

  const handleSave = async () => {
    if (!currentOrg || !editedName.trim()) return;

    setSaving(true);
    setSuccessMessage('');

    try {
      await updateOrganisationName(currentOrg.id, editedName.trim());
      setIsEditing(false);
      setSuccessMessage('Organisation name updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating organisation name:', error);
      alert('Failed to update organisation name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Organisation Settings</h1>
        <p className="text-slate-600 mt-1">Manage your organisation details and settings</p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <Check size={20} className="text-green-600" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 size={20} />
            Organisation Details
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organisation Name
            </label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter organisation name"
                  disabled={saving}
                />
                <button
                  onClick={handleSave}
                  disabled={saving || !editedName.trim()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 transition disabled:opacity-50"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-lg text-slate-900">{currentOrg?.name || 'No organisation'}</p>
                {isAdmin && (
                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                )}
              </div>
            )}
            {!isAdmin && (
              <p className="text-sm text-slate-500 mt-1">
                Only organisation admins can edit the organisation name
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organisation ID
            </label>
            <p className="text-sm text-slate-600 font-mono bg-slate-50 px-3 py-2 rounded border border-slate-200">
              {currentOrg?.id || 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Role
            </label>
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
              {currentOrgRole || 'viewer'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Created
            </label>
            <p className="text-slate-600">
              {currentOrg?.created_at
                ? new Date(currentOrg.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {organisations.length > 1 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Switch Organisation</h2>
          </div>

          <div className="p-6">
            <div className="space-y-2">
              {organisations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => setCurrentOrg(org.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    currentOrg?.id === org.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{org.name}</p>
                      <p className="text-sm text-slate-500">{org.id}</p>
                    </div>
                    {currentOrg?.id === org.id && (
                      <Check size={20} className="text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
