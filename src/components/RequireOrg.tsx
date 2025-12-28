import { ReactNode, useEffect } from 'react';
import { useOrganisation } from '../contexts/OrganisationContext';
import WorkspaceRecovery from './WorkspaceRecovery';

interface RequireOrgProps {
  children: ReactNode;
}

export default function RequireOrg({ children }: RequireOrgProps) {
  const {
    currentOrg,
    organisations,
    loading,
    provisioning,
    setCurrentOrg
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

  if (provisioning || !currentOrg && organisations.length === 0) {
    return <WorkspaceRecovery />;
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
