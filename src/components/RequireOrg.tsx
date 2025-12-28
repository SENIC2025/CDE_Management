import { ReactNode, useEffect, useState } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface RequireOrgProps {
  children: ReactNode;
}

export default function RequireOrg({ children }: RequireOrgProps) {
  const { currentOrg, organisations, loading, provisioning, setCurrentOrg } = useOrganisation();
  const [retryCount, setRetryCount] = useState(0);

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

  if (loading || provisioning) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">
            {provisioning ? 'Setting up your workspace...' : 'Loading organisation...'}
          </p>
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
                Please contact your system administrator or try refreshing the page.
              </p>
              <button
                onClick={() => {
                  setRetryCount(retryCount + 1);
                  window.location.reload();
                }}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition"
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
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
