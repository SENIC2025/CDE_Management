import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2, FolderOpen, FileText, Shield, Download, AlertCircle, Package, BookOpen } from 'lucide-react';

type TabType = 'organisations' | 'projects' | 'audit';

interface OrgSummary {
  org_id: string;
  org_name: string;
  plan_tier: string;
  project_count: number;
  user_count: number;
  created_at: string;
  last_activity: string | null;
}

interface ProjectSummary {
  project_id: string;
  project_title: string;
  org_id: string;
  org_name: string;
  status: string;
  member_count: number;
  created_at: string;
  last_activity: string | null;
}

interface AuditEvent {
  event_id: string;
  org_id: string | null;
  org_name: string | null;
  project_id: string | null;
  user_email: string | null;
  entity_type: string;
  action: string;
  created_at: string;
  metadata: any;
}

export default function PlatformAdmin() {
  const [activeTab, setActiveTab] = useState<TabType>('organisations');
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [orgSummary, setOrgSummary] = useState<OrgSummary[]>([]);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');

  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [exportingBundle, setExportingBundle] = useState(false);
  const [selectedOrgForBundle, setSelectedOrgForBundle] = useState<string | null>(null);

  useEffect(() => {
    checkPlatformAdmin();
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) {
      loadData();
    }
  }, [isPlatformAdmin, activeTab, selectedOrgFilter, entityTypeFilter, actionFilter, dateFilter]);

  async function checkPlatformAdmin() {
    try {
      const { data, error } = await supabase.rpc('is_platform_admin');

      if (error) {
        console.error('Error checking platform admin:', error);
        setIsPlatformAdmin(false);
      } else {
        setIsPlatformAdmin(data);
      }
    } catch (error) {
      console.error('Error checking platform admin:', error);
      setIsPlatformAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'organisations':
          await loadOrganisations();
          break;
        case 'projects':
          await loadProjects();
          break;
        case 'audit':
          await loadAuditEvents();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrganisations() {
    const { data, error } = await supabase.rpc('get_platform_org_summary');

    if (error) {
      console.error('Error loading organisations:', error);
      return;
    }

    setOrgSummary(data || []);
  }

  async function loadProjects() {
    const { data, error } = await supabase.rpc('get_platform_project_summary', {
      p_org_id: selectedOrgFilter || null,
      p_limit: 100
    });

    if (error) {
      console.error('Error loading projects:', error);
      return;
    }

    setProjectSummary(data || []);
  }

  async function loadAuditEvents() {
    const { data, error } = await supabase.rpc('get_platform_audit_events', {
      p_org_id: selectedOrgFilter || null,
      p_entity_type: entityTypeFilter || null,
      p_action: actionFilter || null,
      p_from_date: dateFilter ? new Date(dateFilter).toISOString() : null,
      p_limit: 100
    });

    if (error) {
      console.error('Error loading audit events:', error);
      return;
    }

    setAuditEvents(data || []);
  }

  function exportData() {
    let dataToExport: any[] = [];
    let filename = '';
    let exportAction = '';

    switch (activeTab) {
      case 'organisations':
        dataToExport = orgSummary;
        filename = 'organisations-export.json';
        exportAction = 'export_org_summary';
        break;
      case 'projects':
        dataToExport = projectSummary;
        filename = 'projects-export.json';
        exportAction = 'export_project_summary';
        break;
      case 'audit':
        dataToExport = auditEvents;
        filename = 'audit-events-export.json';
        exportAction = 'export_audit_events';
        break;
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    logPlatformAdminAction(exportAction, {
      record_count: dataToExport.length,
      filters: {
        org_id: selectedOrgFilter || null,
        entity_type: entityTypeFilter || null,
        action: actionFilter || null,
        date: dateFilter || null
      }
    });
  }

  async function exportSupportBundle(orgId: string) {
    if (exportingBundle) return;

    setExportingBundle(true);
    try {
      const { data, error } = await supabase.rpc('get_org_support_bundle', {
        p_org_id: orgId,
        p_date_from: dateFilter ? new Date(dateFilter).toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_date_to: new Date().toISOString()
      });

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `support_bundle_${orgId}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setShowExportConfirm(false);
      setSelectedOrgForBundle(null);
    } catch (error) {
      console.error('Error exporting support bundle:', error);
      alert('Failed to export support bundle. Please try again.');
    } finally {
      setExportingBundle(false);
    }
  }

  async function logPlatformAdminAction(action: string, metadata: any) {
    console.log('Platform admin action logged:', action, metadata);
  }

  if (loading && isPlatformAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">
            You do not have permission to access the Platform Admin Console.
            This area is restricted to platform administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-blue-600" />
            <p className="text-blue-800 font-medium">
              Platform Admin Mode Active (Read-only) - All actions are logged
            </p>
          </div>
          <Link
            to="/platform-admin/policy"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <BookOpen size={16} />
            View Policy
          </Link>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Platform Admin Console</h1>
        <p className="text-slate-600 mt-1">Monitor and manage all organisations, projects, and system activity</p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('organisations')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'organisations'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={20} />
              Organisations
            </div>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'projects'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={20} />
              Projects
            </div>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={20} />
              Audit Log
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {activeTab === 'organisations' && 'Organisation Summary'}
            {activeTab === 'projects' && 'Project Summary'}
            {activeTab === 'audit' && 'Audit Events'}
          </h2>
          <button
            onClick={exportData}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md transition"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'projects' || activeTab === 'audit' ? (
            <div className="mb-6 flex flex-wrap gap-4">
              {activeTab === 'projects' && (
                <input
                  type="text"
                  placeholder="Filter by Org ID"
                  value={selectedOrgFilter}
                  onChange={(e) => setSelectedOrgFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {activeTab === 'audit' && (
                <>
                  <input
                    type="text"
                    placeholder="Filter by Org ID"
                    value={selectedOrgFilter}
                    onChange={(e) => setSelectedOrgFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Entity Type"
                    value={entityTypeFilter}
                    onChange={(e) => setEntityTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Action"
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading...</div>
          ) : (
            <>
              {activeTab === 'organisations' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Organisation</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Plan</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Projects</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Users</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Created</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Last Activity</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgSummary.map((org) => (
                        <tr key={org.org_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-slate-900">{org.org_name}</div>
                              <div className="text-xs text-slate-500 font-mono">{org.org_id}</div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium capitalize">
                              {org.plan_tier}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700">{org.project_count}</td>
                          <td className="p-3 text-slate-700">{org.user_count}</td>
                          <td className="p-3 text-sm text-slate-600">
                            {new Date(org.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {org.last_activity ? new Date(org.last_activity).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setSelectedOrgForBundle(org.org_id);
                                setShowExportConfirm(true);
                              }}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              <Package size={14} />
                              Bundle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orgSummary.length === 0 && (
                    <div className="text-center py-8 text-slate-500">No organisations found</div>
                  )}
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Project</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Organisation</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Status</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Members</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Created</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectSummary.map((project) => (
                        <tr key={project.project_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3">
                            <div>
                              <div className="font-medium text-slate-900">{project.project_title}</div>
                              <div className="text-xs text-slate-500 font-mono">{project.project_id}</div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">{project.org_name}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
                              project.status === 'active' ? 'bg-green-100 text-green-800' :
                              project.status === 'completed' ? 'bg-slate-100 text-slate-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {project.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700">{project.member_count}</td>
                          <td className="p-3 text-sm text-slate-600">
                            {new Date(project.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {project.last_activity ? new Date(project.last_activity).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {projectSummary.length === 0 && (
                    <div className="text-center py-8 text-slate-500">No projects found</div>
                  )}
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Timestamp</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">User</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Organisation</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Entity Type</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Action</th>
                        <th className="text-left p-3 text-sm font-semibold text-slate-700">Metadata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEvents.map((event) => (
                        <tr key={event.event_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-sm text-slate-600">
                            {new Date(event.created_at).toLocaleString()}
                          </td>
                          <td className="p-3 text-sm text-slate-700">{event.user_email || 'N/A'}</td>
                          <td className="p-3 text-sm text-slate-700">{event.org_name || 'N/A'}</td>
                          <td className="p-3">
                            <span className="inline-block bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs font-mono">
                              {event.entity_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                              {event.action}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-slate-600 max-w-xs truncate">
                            {JSON.stringify(event.metadata)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {auditEvents.length === 0 && (
                    <div className="text-center py-8 text-slate-500">No audit events found</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showExportConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Package size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Export Support Bundle</h3>
                <p className="text-sm text-slate-600">Org ID: {selectedOrgForBundle}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                This export is logged and intended for support/incident response only.
                The bundle contains redacted metadata and excludes sensitive content.
              </p>
            </div>

            <div className="text-sm text-slate-700 mb-4">
              <p className="font-medium mb-2">The bundle will include:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Organisation and project metadata</li>
                <li>Compliance status summaries</li>
                <li>Decision flag counts</li>
                <li>Audit event metadata (last 30 days)</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowExportConfirm(false);
                  setSelectedOrgForBundle(null);
                }}
                disabled={exportingBundle}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedOrgForBundle && exportSupportBundle(selectedOrgForBundle)}
                disabled={exportingBundle}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exportingBundle ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Bundle
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
