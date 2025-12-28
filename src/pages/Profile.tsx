import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { supabase } from '../lib/supabase';
import {
  User,
  Building2,
  LogOut,
  Save,
  Check,
  Plus,
  Key,
  Copy,
  RefreshCw,
  Users
} from 'lucide-react';

interface OrgListItem {
  org_id: string;
  org_name: string;
  my_role: string;
  member_since: string;
  join_code: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { organisations, currentOrg, setCurrentOrg, refreshOrganisations } = useOrganisation();

  // Account state
  const [name, setName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Organisation state
  const [orgList, setOrgList] = useState<OrgListItem[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [showJoinOrg, setShowJoinOrg] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joiningOrg, setJoiningOrg] = useState(false);
  const [orgError, setOrgError] = useState('');
  const [orgSuccess, setOrgSuccess] = useState('');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setJobTitle(profile.job_title || '');
      loadOrgList();
    }
  }, [profile]);

  async function loadOrgList() {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase.rpc('list_my_organisations');
      if (error) throw error;
      setOrgList(data || []);
    } catch (error) {
      console.error('[Profile] Error loading org list:', error);
    } finally {
      setLoadingOrgs(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const { error } = await supabase.rpc('update_my_profile', {
        p_name: name.trim() || null,
        p_job_title: jobTitle.trim() || null
      });

      if (error) throw error;

      setProfileSuccess('Profile updated successfully');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (error: any) {
      console.error('[Profile] Error saving profile:', error);
      setProfileError(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleCreateOrganisation() {
    if (!newOrgName.trim()) {
      setOrgError('Organisation name is required');
      return;
    }

    setCreatingOrg(true);
    setOrgError('');
    setOrgSuccess('');

    try {
      console.log('[Profile] Creating organisation:', newOrgName.trim());
      const { data: orgId, error } = await supabase.rpc('create_organisation', {
        p_name: newOrgName.trim()
      });

      if (error) {
        console.error('[Profile] RPC error creating organisation:', error);
        throw error;
      }

      console.log('[Profile] Organisation created successfully:', orgId);
      setOrgSuccess('Organisation created successfully');
      setShowCreateOrg(false);
      setNewOrgName('');

      // Refresh organisations and select the new one
      await refreshOrganisations();
      await loadOrgList();

      if (orgId) {
        setCurrentOrg(orgId);
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      }
    } catch (error: any) {
      console.error('[Profile] Exception creating organisation:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to create organisation. Please try again.';
      setOrgError(errorMessage);
      console.error('[Profile] Full error object:', JSON.stringify(error, null, 2));
    } finally {
      setCreatingOrg(false);
    }
  }

  async function handleJoinOrganisation() {
    if (!joinCode.trim()) {
      setOrgError('Join code is required');
      return;
    }

    setJoiningOrg(true);
    setOrgError('');
    setOrgSuccess('');

    try {
      const { data: orgId, error } = await supabase.rpc('join_organisation_by_code', {
        p_code: joinCode.trim()
      });

      if (error) throw error;

      setOrgSuccess('Joined organisation successfully');
      setShowJoinOrg(false);
      setJoinCode('');

      // Refresh organisations and select the joined one
      await refreshOrganisations();
      await loadOrgList();

      if (orgId) {
        setCurrentOrg(orgId);
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      }
    } catch (error: any) {
      console.error('[Profile] Error joining organisation:', error);
      setOrgError(error.message || 'Failed to join organisation');
    } finally {
      setJoiningOrg(false);
    }
  }

  async function handleGenerateJoinCode(orgId: string) {
    setGeneratingCode(true);
    setOrgError('');

    try {
      const { data: code, error } = await supabase.rpc('generate_join_code', {
        p_org_id: orgId
      });

      if (error) throw error;

      // Refresh the org list to show new code
      await loadOrgList();
      setOrgSuccess('Join code generated successfully');
      setTimeout(() => setOrgSuccess(''), 3000);
    } catch (error: any) {
      console.error('[Profile] Error generating join code:', error);
      setOrgError(error.message || 'Failed to generate join code. You must be an admin.');
      setTimeout(() => setOrgError(''), 5000);
    } finally {
      setGeneratingCode(false);
    }
  }

  function handleCopyJoinCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('currentOrgId');
      navigate('/login');
    } catch (error) {
      console.error('[Profile] Error signing out:', error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-600 mt-1">Manage your account, organisations, and session</p>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <User size={20} />
            Account
          </h2>
          <p className="text-sm text-slate-600 mt-1">Update your personal information</p>
        </div>

        <div className="p-6 space-y-4">
          {profileSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <Check size={20} className="text-green-600" />
              <p className="text-green-800">{profileSuccess}</p>
            </div>
          )}
          {profileError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{profileError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your job title (optional)"
            />
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={18} />
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Organisation Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building2 size={20} />
            Organisations
          </h2>
          <p className="text-sm text-slate-600 mt-1">Manage your organisation memberships</p>
        </div>

        <div className="p-6 space-y-4">
          {orgSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <Check size={20} className="text-green-600" />
              <p className="text-green-800">{orgSuccess}</p>
            </div>
          )}
          {orgError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{orgError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Current Organisation
            </label>
            <select
              value={currentOrg?.id || ''}
              onChange={(e) => {
                setCurrentOrg(e.target.value);
                setOrgSuccess('Organisation switched successfully');
                setTimeout(() => setOrgSuccess(''), 2000);
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {organisations.length === 0 && (
                <option value="">No organisations</option>
              )}
              {organisations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {loadingOrgs ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="animate-spin text-blue-600" size={24} />
            </div>
          ) : orgList.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-700">Your Organisations</h3>
              {orgList.map(org => (
                <div key={org.org_id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{org.org_name}</h4>
                      <p className="text-sm text-slate-600">Role: {org.my_role}</p>
                      {org.join_code && (
                        <div className="mt-2 flex items-center gap-2">
                          <Key size={14} className="text-slate-400" />
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">{org.join_code}</code>
                          <button
                            onClick={() => handleCopyJoinCode(org.join_code!)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Copy join code"
                          >
                            {copiedCode === org.join_code ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      )}
                      {!org.join_code && org.my_role === 'admin' && (
                        <button
                          onClick={() => handleGenerateJoinCode(org.org_id)}
                          disabled={generatingCode}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-slate-400"
                        >
                          {generatingCode ? 'Generating...' : 'Generate join code'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setShowCreateOrg(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              Create Organisation
            </button>

            <button
              onClick={() => setShowJoinOrg(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Users size={18} />
              Join Organisation
            </button>
          </div>
        </div>
      </div>

      {/* Session Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <LogOut size={20} />
            Session
          </h2>
          <p className="text-sm text-slate-600 mt-1">Manage your authentication session</p>
        </div>

        <div className="p-6">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Create Organisation Modal */}
      {showCreateOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Create Organisation</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organisation Name *
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="My Organisation"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateOrganisation}
                  disabled={creatingOrg || !newOrgName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingOrg ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateOrg(false);
                    setNewOrgName('');
                    setOrgError('');
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Organisation Modal */}
      {showJoinOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Join Organisation</h3>
              <p className="text-sm text-slate-600 mt-1">Enter the invite code provided by your organisation admin</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Join Code *
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="ABCD1234"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleJoinOrganisation}
                  disabled={joiningOrg || !joinCode.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {joiningOrg ? 'Joining...' : 'Join'}
                </button>
                <button
                  onClick={() => {
                    setShowJoinOrg(false);
                    setJoinCode('');
                    setOrgError('');
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
