import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganisation } from '../contexts/OrganisationContext';
import { supabase } from '../lib/supabase';
import {
  AlertCircle,
  RefreshCw,
  Building2,
  User,
  LogOut,
  Rocket,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

export default function WorkspaceRecovery() {
  const navigate = useNavigate();
  const { provisioning, provisioningError, retryProvisioning, refreshOrganisations, setCurrentOrg } = useOrganisation();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createError, setCreateError] = useState('');

  async function handleCreateOrganisation() {
    if (!newOrgName.trim()) {
      setCreateError('Organisation name is required');
      return;
    }

    setCreatingOrg(true);
    setCreateError('');

    try {
      console.log('[Org] create start - name:', newOrgName.trim());

      const { data: rpcResponse, error } = await supabase.rpc('create_organisation', {
        p_name: newOrgName.trim()
      });

      if (error) {
        console.error('[Org] RPC error creating organisation:', error);
        throw error;
      }

      let createdOrgId: string | null = null;
      if (typeof rpcResponse === 'string') {
        createdOrgId = rpcResponse;
      } else if (rpcResponse && typeof rpcResponse === 'object') {
        createdOrgId = (rpcResponse as any).org_id || (rpcResponse as any).id;
      }

      if (!createdOrgId) {
        throw new Error('Organisation created but ID not returned. Please refresh the page.');
      }

      console.log('[Org] create success orgId=', createdOrgId);

      console.log('[Org] Refreshing organisations...');
      await refreshOrganisations();

      console.log('[Org] Setting current org to:', createdOrgId);
      setCurrentOrg(createdOrgId);

      setShowCreateOrg(false);
      setNewOrgName('');

      console.log('[Org] navigation to /dashboard');
      setTimeout(() => {
        navigate('/dashboard');
      }, 300);

    } catch (error: any) {
      console.error('[Org] Exception creating organisation:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to create organisation. Please try again.';
      setCreateError(errorMessage);
      console.error('[Org] Full error object:', JSON.stringify(error, null, 2));
    } finally {
      setCreatingOrg(false);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('currentOrgId');
      navigate('/login');
    } catch (error) {
      console.error('[WorkspaceRecovery] Error signing out:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Rocket size={32} />
              <h1 className="text-2xl font-bold">Workspace Setup</h1>
            </div>
            <p className="text-blue-100">
              Let's get your workspace ready so you can start managing your projects
            </p>
          </div>

          <div className="p-8 space-y-6">
            {/* Provisioning in progress */}
            {provisioning && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <RefreshCw className="animate-spin text-blue-600" size={24} />
                  <h2 className="text-lg font-semibold text-blue-900">Creating Your Workspace...</h2>
                </div>
                <p className="text-blue-700">
                  This will only take a moment. We're setting up your organisation and creating your first project.
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>Creating organisation...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <span>Setting up starter project...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    <span>Configuring permissions...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Provisioning error */}
            {!provisioning && provisioningError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-red-900 mb-2">Setup Failed</h2>
                    <p className="text-red-700 mb-3">
                      We encountered an error while setting up your workspace:
                    </p>
                    <div className="bg-red-100 border border-red-200 rounded p-3 font-mono text-sm text-red-800">
                      {provisioningError}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No provisioning error, just no org */}
            {!provisioning && !provisioningError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 flex-shrink-0" size={24} />
                  <div>
                    <h2 className="text-lg font-semibold text-amber-900 mb-2">No Organisation Found</h2>
                    <p className="text-amber-700">
                      You're not currently a member of any organisation. Choose one of the options below to get started.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons - always visible when not provisioning */}
            {!provisioning && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Choose an option:</h3>

                {/* Setup Workspace (auto-provision) */}
                <button
                  onClick={retryProvisioning}
                  className="w-full flex items-center justify-between p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-300 hover:bg-blue-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                      <Rocket size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-blue-900">Setup Workspace Automatically</div>
                      <div className="text-sm text-blue-700">
                        Quick start: creates organisation and first project for you
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-blue-600 group-hover:translate-x-1 transition-transform" size={20} />
                </button>

                {/* Create Organisation Manually */}
                <button
                  onClick={() => setShowCreateOrg(true)}
                  className="w-full flex items-center justify-between p-4 border-2 border-slate-200 bg-white rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-600 text-white rounded-lg">
                      <Building2 size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Create Organisation Manually</div>
                      <div className="text-sm text-slate-600">
                        Choose your organisation name and settings
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-600 group-hover:translate-x-1 transition-transform" size={20} />
                </button>

                {/* Go to Profile */}
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center justify-between p-4 border-2 border-slate-200 bg-white rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-600 text-white rounded-lg">
                      <User size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Go to Profile</div>
                      <div className="text-sm text-slate-600">
                        Join an existing organisation or manage settings
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-600 group-hover:translate-x-1 transition-transform" size={20} />
                </button>
              </div>
            )}

            {/* Sign Out Link */}
            {!provisioning && (
              <div className="pt-6 border-t border-slate-200">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            Need help? Contact your administrator or check the documentation.
          </p>
        </div>
      </div>

      {/* Create Organisation Modal */}
      {showCreateOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Create Organisation</h3>
              <p className="text-sm text-slate-600 mt-1">
                This will create a new organisation with you as the admin
              </p>
            </div>
            <div className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{createError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organisation Name *
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newOrgName.trim()) {
                      handleCreateOrganisation();
                    }
                  }}
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
                  {creatingOrg ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin" size={16} />
                      Creating...
                    </span>
                  ) : (
                    'Create'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateOrg(false);
                    setNewOrgName('');
                    setCreateError('');
                  }}
                  disabled={creatingOrg}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:bg-slate-100"
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
