import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { logAuditEvent } from '../lib/audit';
import { ConfirmDialog } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import {
  Shield,
  Users,
  FileText,
  Database,
  Download,
  User,
  Crown,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Key,
  UserPlus,
  Trash2,
  RefreshCw,
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
  const { currentOrg, currentOrgRole } = useOrganisation();
  const { isOrgAdmin, entitlements } = useEntitlements();
  // Check admin via BOTH contexts — EntitlementsContext uses is_org_admin RPC,
  // OrganisationContext uses list_my_organisations RPC. Either one succeeding is enough.
  const isAdmin = isOrgAdmin || currentOrgRole === 'admin';
  // Use org ID from OrganisationContext (loaded via RPC) — profile.org_id may be null due to RLS
  const orgId = currentOrg?.id || profile?.org_id;
  const [confirmProps, confirmDialog] = useConfirm();
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

  // Invite state
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    if (orgId && isAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [orgId, isAdmin]);

  useEffect(() => {
    if (activeTab === 'audit' && isAdmin) {
      loadAuditEvents();
    }
  }, [activeTab, auditFilters, page]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadMembers(), loadDataCounts(), loadJoinCode()]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadJoinCode() {
    try {
      const { data } = await supabase.rpc('list_my_organisations');
      if (data) {
        const currentOrgData = data.find((o: any) => o.org_id === orgId);
        setJoinCode(currentOrgData?.join_code || null);
      }
    } catch {
      // Non-critical — join code just won't show
    }
  }

  async function handleGenerateJoinCode() {
    if (!orgId) {
      setInviteError('No organisation selected');
      return;
    }
    setGeneratingCode(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      console.log('[Security] Generating join code for org:', orgId);
      const { data: code, error } = await supabase.rpc('generate_join_code', {
        p_org_id: orgId
      });
      console.log('[Security] generate_join_code result:', { code, error });
      if (error) throw error;

      // Set the code directly from the RPC response
      if (code) {
        setJoinCode(code);
        setInviteSuccess('Join code generated! Share it with team members.');
        setTimeout(() => setInviteSuccess(''), 4000);
      } else {
        // Fallback: reload from list_my_organisations
        await loadJoinCode();
        if (!joinCode) {
          setInviteError('Code was generated but could not be retrieved. Please refresh the page.');
        } else {
          setInviteSuccess('Join code generated!');
          setTimeout(() => setInviteSuccess(''), 4000);
        }
      }
    } catch (error: any) {
      console.error('[Security] generate_join_code error:', error);
      const msg = error.message || 'Failed to generate join code';
      setInviteError(msg);
      // Don't auto-clear errors — let the user see them
    } finally {
      setGeneratingCode(false);
    }
  }

  function handleCopyCode() {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleRemoveMember(memberId: string, memberUserId: string) {
    if (!profile) return;
    if (memberUserId === profile.id) {
      alert('You cannot remove yourself from the organisation.');
      return;
    }
    const confirmed = await confirmDialog({ title: 'Remove member?', message: 'They will lose access to all projects in this organisation.' });
    if (!confirmed) return;

    try {
      const oldMember = members.find(m => m.id === memberId);

      const { error } = await supabase
        .from('organisation_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // Audit: organisation_members not in AuditEntityType — log directly
      await supabase.from('audit_events').insert({
        org_id: orgId!,
        project_id: null,
        user_id: profile.id,
        entity_type: 'organisation_members',
        entity_id: memberId,
        action: 'delete',
        diff_json: { before: { role: oldMember?.role, user_id: memberUserId } },
        timestamp: new Date().toISOString(),
      });

      await loadMembers();
      alert('Member removed successfully');
    } catch (error: any) {
      console.error('Error removing member:', error);
      alert('Failed to remove member: ' + error.message);
    }
  }

  async function loadMembers() {
    if (!orgId) return;

    const { data: membersData } = await supabase
      .from('organisation_members')
      .select(`
        *,
        user:users!organisation_members_user_id_fkey(name, email)
      `)
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false });

    if (membersData) {
      const membersWithActivity = await Promise.all(
        membersData.map(async (member: any) => {
          const { data: lastSeenData } = await supabase
            .from('user_last_seen')
            .select('last_seen_at')
            .eq('user_id', member.user_id)
            .eq('org_id', orgId!)
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
    if (!orgId) return;

    let query = supabase
      .from('audit_events')
      .select(`
        *,
        user:users!audit_events_user_id_fkey(name, email)
      `)
      .eq('org_id', orgId!)
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
    if (!orgId) return;

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
          .eq('org_id', orgId!);

        counts[table] = count || 0;
      })
    );

    setDataCounts(counts);
  }

  async function handleRoleChange(memberId: string, userId: string, newRole: string) {
    if (!profile) return;

    const confirmed = await confirmDialog({ title: 'Change role?', message: `This member's role will be changed to ${newRole}.`, variant: 'warning', confirmLabel: 'Change Role' });
    if (!confirmed) return;

    try {
      const oldMember = members.find((m) => m.id === memberId);

      const { error } = await supabase
        .from('organisation_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      await logAuditEvent(
        orgId!,
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
    if (!orgId) return;

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
        .eq('org_id', orgId!)
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
        orgId!,
        null,
        profile!.id,
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
    if (!orgId) return;

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

  if (!isAdmin) {
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
        <div className="space-y-4">
          {/* ─── Invite Members Card ─── */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Invite Members</h2>
              </div>
              {entitlements?.max_members !== null && entitlements?.max_members !== undefined && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  members.length >= (entitlements.max_members ?? Infinity)
                    ? 'bg-red-100 text-red-700'
                    : members.length >= (entitlements.max_members ?? Infinity) * 0.8
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {members.length} / {entitlements.max_members} seats used
                </span>
              )}
            </div>

            {members.length >= (entitlements?.max_members ?? Infinity) && entitlements?.max_members !== null && (
              <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Seat limit reached ({entitlements?.max_members}). New members won&apos;t be able to join until you upgrade or remove existing members.
              </div>
            )}

            {inviteError && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="mb-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0" />
                {inviteSuccess}
              </div>
            )}

            {joinCode ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Share this join code with people you want to invite. They can enter it on their <strong>Profile</strong> page under "Join Organisation".
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white border border-blue-300 rounded-lg px-4 py-2.5">
                    <Key className="h-4 w-4 text-blue-500" />
                    <code className="text-lg font-mono font-bold tracking-wider text-slate-900">{joinCode}</code>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    {copiedCode ? (
                      <><Check className="h-4 w-4" /> Copied!</>
                    ) : (
                      <><Copy className="h-4 w-4" /> Copy Code</>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateJoinCode}
                    disabled={generatingCode}
                    className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-white transition-colors text-sm disabled:opacity-50"
                    title="Generate a new code (old one will stop working)"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatingCode ? 'animate-spin' : ''}`} />
                    New Code
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Generating a new code will invalidate the previous one.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Generate a join code to invite new members. They'll use this code on their Profile page to join your organisation.
                </p>
                <button
                  onClick={handleGenerateJoinCode}
                  disabled={generatingCode}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {generatingCode ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Key className="h-4 w-4" /> Generate Join Code</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ─── Members Table ─── */}
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
                      {member.user_id !== profile?.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, member.user_id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user_id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove member"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">You</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
