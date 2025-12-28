import { ReactNode, useEffect } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import { AlertCircle, RefreshCw, Mail } from 'lucide-react';

interface RequireOrgProps {
  children: ReactNode;
}

export default function RequireOrg({ children }: RequireOrgProps) {
  const {
    currentOrg,
    organisations,
    loading,
    provisioning,
    provisioningError,
    setCurrentOrg,
    retryProvisioning
  } = useOrganisation();

  useEffect(() => {
    if (!loading && !provisioning && !currentOrg && organisations.length > 0) {
      const savedOrgId = localStorage.getItem('currentOrgId');
      const savedOrg = organisations.find(o => o.id === savedOrgId);

      if (savedOrg) {
        setCurrentOrg(savedOrg.id);
      } else {
        setCurrentOrg(organisations[0].id);
        localStorage.setItem('currentOrgId', organisations[0].id);
      }
    }
  }, [loading, provisioning, currentOrg, organisations, setCurrentOrg]);

  if (provisioning) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Creating your workspace
          </h3>
          <p className="text-slate-600">
            Setting up your organisation and first project. This will only take a moment...
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading organisation...</p>
        </div>
      </div>
    );
  }

  if (provisioningError) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-red-900 mb-2">
                Workspace Setup Failed
              </h2>
              <p className="text-red-800 mb-3">
                We encountered an error while creating your workspace:
              </p>
              <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                <p className="text-sm text-red-900 font-mono">
                  {provisioningError}
                </p>
              </div>
              <p className="text-red-800 mb-4">
                This error has been logged for troubleshooting. You can try again or contact support.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('Retry provisioning clicked');
                    retryProvisioning();
                  }}
                  disabled={provisioning}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={provisioning ? 'animate-spin' : ''} />
                  {provisioning ? 'Retrying...' : 'Retry Setup'}
                </button>
                <a
                  href="mailto:support@example.com?subject=Workspace Setup Error"
                  className="flex items-center gap-2 border border-red-300 text-red-800 hover:bg-red-100 px-4 py-2 rounded-md transition"
                >
                  <Mail size={16} />
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrg && organisations.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={24} className="text-yellow-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-yellow-900 mb-2">
                No Organisation Access
              </h2>
              <p className="text-yellow-800 mb-4">
                You do not have access to any organisation. This may happen if:
              </p>
              <ul className="list-disc list-inside space-y-1 text-yellow-800 mb-4 ml-4">
                <li>Your membership was removed by an administrator</li>
                <li>There was an issue during initial setup</li>
                <li>Your account needs to be configured</li>
              </ul>
              <p className="text-yellow-800 mb-4">
                Try setting up your workspace again, or contact support if the problem persists.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('Setup workspace clicked');
                    retryProvisioning();
                  }}
                  disabled={provisioning}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={16} className={provisioning ? 'animate-spin' : ''} />
                  {provisioning ? 'Setting up...' : 'Setup Workspace'}
                </button>
                <a
                  href="mailto:support@example.com?subject=No Organisation Access"
                  className="flex items-center gap-2 border border-yellow-300 text-yellow-800 hover:bg-yellow-100 px-4 py-2 rounded-md transition"
                >
                  <Mail size={16} />
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading organisation...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
