import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { logAuditEvent } from '../lib/audit';
import {
  Shield,
  Users,
  FileText,
  Database,
  Download,
  Calendar,
  User,
  Crown,
  Clock,
  Search,
  AlertCircle,
} from 'lucide-react';

interface OrgMember {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  last_seen?: string;
  project_count: number;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  user_id: string | null;
  entity_type: string;
  action: string;
  diff_json: any;
  user?: {
    name: string;
    email: string;
  };
}

export default function AdminSecurity() {
  const { profile } = useAuth();
  const { isOrgAdmin } = useEntitlements();
  const [activeTab, setActiveTab] = useState<'access' | 'audit' | 'data'>('access');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [dataCounts, setDataCounts] = useState<Record<string, number>>({});

  const [auditFilters, setAuditFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    entityType: '',
    action: '',
    userId: '',
  });

  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    if (profile?.org_id && isOrgAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [profile?.org_id, isOrgAdmin]);

  useEffect(() => {
    if (activeTab === 'audit' && isOrgAdmin) {
      loadAuditEvents();
    }
  }, [activeTab, auditFilters, page]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadMembers(), loadDataCounts()]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    if (!profile?.org_id) return;

    const { data: membersData } = await supabase
      .from('organisation_members')
      .select(`
        *,
        user:users!organisation_members_user_id_fkey(name, email)
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (membersData) {
      const membersWithActivity = await Promise.all(
        membersData.map(async (member: any) => {
          const { data: lastSeenData } = await supabase
            .from('user_last_seen')
            .select('last_seen_at')
            .eq('user_id', member.user_id)
            .eq('org_id', profile.org_id!)
            .single();

          const { count } = await supabase
            .from('project_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', member.user_id);

          return {
            ...member,
            last_seen: lastSeenData?.last_seen_at,
            project_count: count || 0,
          };
        })
      );

      setMembers(membersWithActivity as OrgMember[]);
    }
  }

  async function loadAuditEvents() {
    if (!profile?.org_id) return;

    let query = supabase
      .from('audit_events')
      .select(`
        *,
        user:users!audit_events_user_id_fkey(name, email)
      `)
      .eq('org_id', profile.org_id)
      .gte('timestamp', new Date(auditFilters.startDate).toISOString())
      .lte('timestamp', new Date(auditFilters.endDate + 'T23:59:59').toISOString())
      .order('timestamp', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (auditFilters.entityType) {
      query = query.eq('entity_type', auditFilters.entityType);
    }
    if (auditFilters.action) {
      query = query.eq('action', auditFilters.action);
    }
    if (auditFilters.userId) {
      query = query.eq('user_id', auditFilters.userId);
    }

    const { data } = await query;
    if (data) {
      setAuditEvents(data as AuditEvent[]);
    }
  }

  async function loadDataCounts() {
    if (!profile?.org_id) return;

    const counts: Record<string, number> = {};

    const tables = [
      'projects',
      'activities',
      'cde_objectives',
      'stakeholder_groups',
      'indicators',
      'evidence_items',
      'messages',
      'result_assets',
    ];

    await Promise.all(
      tables.map(async (table) => {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('org_id', profile.org_id!);

        counts[table] = count || 0;
      })
    );

    setDataCounts(counts);
  }

  async function handleRoleChange(memberId: string, userId: string, newRole: string) {
    if (!profile) return;

    const confirmed = confirm(`Change this member's role to ${newRole}?`);
    if (!confirmed) return;

    try {
      const oldMember = members.find((m) => m.id === memberId);

      const { error } = await supabase
        .from('organisation_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await logAuditEvent(
        profile.org_id!,
        null,
        profile.id,
        'organisation_members',
        memberId,
        'update',
        { role: oldMember?.role },
        { role: newRole }
      );

      await loadMembers();
      alert('Role updated successfully');
    } catch (error: any) {
      console.error('Error updating role:', error);
      alert('Failed to update role: ' + error.message);
    }
  }

  async function handleExportAudit() {
    if (!profile?.org_id) return;

    try {
      const { data } = await supabase
        .from('audit_events')
        .select(`
          timestamp,
          entity_type,
          action,
          user:users!audit_events_user_id_fkey(name, email),
          diff_json
        `)
        .eq('org_id', profile.org_id)
        .gte('timestamp', new Date(auditFilters.startDate).toISOString())
        .lte('timestamp', new Date(auditFilters.endDate + 'T23:59:59').toISOString())
        .order('timestamp', { ascending: false });

      if (!data || data.length === 0) {
        alert('No audit events found for the selected period');
        return;
      }

      const csv = [
        ['Timestamp', 'User', 'Entity Type', 'Action', 'Details'].join(','),
        ...data.map((event: any) =>
          [
            event.timestamp,
            event.user?.email || 'System',
            event.entity_type,
            event.action,
            JSON.stringify(event.diff_json).replace(/"/g, '""'),
          ]
            .map((field) => `"${field}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-export-${auditFilters.startDate}-to-${auditFilters.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      await logAuditEvent(
        profile.org_id!,
        null,
        profile.id,
        'audit_export',
        '',
        'create',
        undefined,
        { filters: auditFilters, count: data.length }
      );

      alert(`Exported ${data.length} audit events`);
    } catch (error: any) {
      console.error('Error exporting audit:', error);
      alert('Failed to export audit log: ' + error.message);
    }
  }

  async function handleExportDataIndex() {
    if (!profile?.org_id) return;

    try {
      const csv = [
        ['Entity Type', 'Count'].join(','),
        ...Object.entries(dataCounts).map(([type, count]) => [type, count].join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-index-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      alert('Data index exported successfully');
    } catch (error: any) {
      console.error('Error exporting data index:', error);
      alert('Failed to export data index: ' + error.message);
    }
  }

  if (!isOrgAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 flex items-center gap-3">
          <AlertCircle size={24} className="text-orange-600" />
          <div>
            <h3 className="font-semibold text-orange-900 mb-1">Access Denied</h3>
            <p className="text-sm text-orange-800">
              Only organisation administrators can access the Security panel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading security data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Shield size={32} className="text-blue-600" />
          Security & Audit
        </h1>
        <p className="text-slate-600 mt-1">Manage access, review audit logs, and monitor data</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('access')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'access' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <Users size={18} />
          Access & Roles
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'audit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <FileText size={18} />
          Audit Log
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'data' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'
          }`}
        >
          <Database size={18} />
          Data & Retention
        </button>
      </div>

      {/* Access & Roles Tab */}
      {activeTab === 'access' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-slate-900">Organisation Members</h2>
            <p className="text-sm text-slate-600 mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''} in your organisation
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Org Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Projects</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Seen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={20} className="text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-900">{member.user.name}</div>
                          <div className="text-sm text-slate-600">{member.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {member.role === 'admin' && <Crown size={16} className="text-yellow-600" />}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.role === 'admin'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{member.project_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Clock size={14} />
                        {member.last_seen
                          ? new Date(member.last_seen).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.user_id !== profile?.id && (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, member.user_id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={auditFilters.startDate}
                  onChange={(e) => {
                    setAuditFilters({ ...auditFilters, startDate: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={auditFilters.endDate}
                  onChange={(e) => {
                    setAuditFilters({ ...auditFilters, endDate: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type</label>
                <input
                  type="text"
                  value={auditFilters.entityType}
                  onChange={(e) => {
                    setAuditFilters({ ...auditFilters, entityType: e.target.value });
                    setPage(1);
                  }}
                  placeholder="e.g., project"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
                <input
                  type="text"
                  value={auditFilters.action}
                  onChange={(e) => {
                    setAuditFilters({ ...auditFilters, action: e.target.value });
                    setPage(1);
                  }}
                  placeholder="e.g., create, update"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleExportAudit}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
              >
                <Download size={16} />
                Export CSV
              </button>

              <button
                onClick={() => {
                  setAuditFilters({
                    ...auditFilters,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                  });
                  setPage(1);
                }}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 text-sm"
              >
                Last 30 Days
              </button>

              <button
                onClick={() => {
                  setAuditFilters({
                    ...auditFilters,
                    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                  });
                  setPage(1);
                }}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 text-sm"
              >
                Last Quarter
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">
                        {event.user?.email || 'System'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-800">
                          {event.entity_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            event.action === 'create'
                              ? 'bg-green-100 text-green-800'
                              : event.action === 'update'
                              ? 'bg-blue-100 text-blue-800'
                              : event.action === 'delete'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {event.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                        {JSON.stringify(event.diff_json)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {auditEvents.length === 0 && (
              <div className="p-8 text-center text-slate-600">
                No audit events found for the selected filters
              </div>
            )}

            <div className="p-4 border-t flex items-center justify-between">
              <span className="text-sm text-slate-600">
                Page {page} • Showing up to {pageSize} events
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="bg-slate-200 text-slate-700 px-3 py-1 rounded-md hover:bg-slate-300 disabled:opacity-50 text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={auditEvents.length < pageSize}
                  className="bg-slate-200 text-slate-700 px-3 py-1 rounded-md hover:bg-slate-300 disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data & Retention Tab */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-slate-900">Data Overview</h2>
              <p className="text-sm text-slate-600 mt-1">Summary of data stored in your organisation</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(dataCounts).map(([type, count]) => (
                  <div key={type} className="border rounded-lg p-4">
                    <div className="text-sm text-slate-600 mb-1 capitalize">
                      {type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{count.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <button
                  onClick={handleExportDataIndex}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  <Download size={16} />
                  Export Data Index
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Data Retention</h3>
            <p className="text-sm text-blue-800 mb-4">
              All data is retained indefinitely unless explicitly deleted. Audit events are append-only and cannot be
              deleted. For data deletion requests or retention policy questions, contact your system administrator.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
