import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useProject } from '../contexts/ProjectContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import {
  Building2,
  Edit2,
  Save,
  X,
  Check,
  Users,
  FolderOpen,
  Crown,
  Shield,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Plus,
  ExternalLink,
  Zap,
  ClipboardList,
  UserPlus,
  Package,
  ChevronRight,
  Sparkles
} from 'lucide-react';

// ─── Org Profile Store (localStorage) ───
interface OrgProfile {
  description: string;
  country: string;
  website: string;
  focusAreas: string[];
}

function loadOrgProfile(orgId: string): OrgProfile {
  try {
    const raw = localStorage.getItem(`cde_org_profile_${orgId}`);
    return raw ? JSON.parse(raw) : { description: '', country: '', website: '', focusAreas: [] };
  } catch {
    return { description: '', country: '', website: '', focusAreas: [] };
  }
}

function saveOrgProfile(orgId: string, profile: OrgProfile) {
  localStorage.setItem(`cde_org_profile_${orgId}`, JSON.stringify(profile));
}

const EU_PROGRAMMES = [
  'Horizon Europe', 'Erasmus+', 'Creative Europe', 'Interreg',
  'Digital Europe', 'LIFE', 'CERV', 'AMIF', 'Connecting Europe Facility'
];

export default function OrganisationSettings() {
  const { profile } = useAuth();
  const { organisations, currentOrg, currentOrgRole, setCurrentOrg, updateOrganisationName } = useOrganisation();
  const { currentProject } = useProject();
  const { entitlements, planTier, planStatus, isOrgAdmin } = useEntitlements();

  // Edit org name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Data
  const [members, setMembers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Org profile
  const [orgProfile, setOrgProfile] = useState<OrgProfile>({ description: '', country: '', website: '', focusAreas: [] });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<OrgProfile>({ description: '', country: '', website: '', focusAreas: [] });

  const isAdmin = currentOrgRole === 'admin' || isOrgAdmin;

  // Load data
  useEffect(() => {
    if (currentOrg?.id) {
      loadMembers();
      loadProjects();
      setOrgProfile(loadOrgProfile(currentOrg.id));
    }
  }, [currentOrg?.id]);

  async function loadMembers() {
    if (!currentOrg) return;
    setLoadingMembers(true);
    try {
      const { data } = await supabase
        .from('organisation_members')
        .select('id, org_id, user_id, role, created_at')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: true });
      setMembers(data || []);
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadProjects() {
    if (!currentOrg) return;
    setLoadingProjects(true);
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, title, description, programme_profile, status, start_date, end_date, created_at')
        .eq('org_id', currentOrg.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      setProjects(data || []);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  }

  // ─── Name editing ───
  function handleStartEditName() {
    setEditedName(currentOrg?.name || '');
    setIsEditingName(true);
  }

  async function handleSaveName() {
    if (!currentOrg || !editedName.trim()) return;
    setSaving(true);
    try {
      await updateOrganisationName(currentOrg.id, editedName.trim());
      setIsEditingName(false);
      showSuccess('Organisation name updated');
    } catch (err: any) {
      alert('Failed to update organisation name: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  // ─── Profile editing ───
  function handleStartEditProfile() {
    setEditedProfile({ ...orgProfile });
    setIsEditingProfile(true);
  }

  function handleSaveProfile() {
    if (!currentOrg) return;
    saveOrgProfile(currentOrg.id, editedProfile);
    setOrgProfile(editedProfile);
    setIsEditingProfile(false);
    showSuccess('Organisation profile updated');
  }

  function toggleFocusArea(area: string) {
    setEditedProfile(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter(a => a !== area)
        : [...prev.focusAreas, area]
    }));
  }

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  }

  // ─── Computed stats ───
  const daysSinceCreation = currentOrg?.created_at
    ? Math.floor((Date.now() - new Date(currentOrg.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const adminCount = members.filter(m => m.role === 'admin').length;
  const memberCount = members.length;
  const activeProjects = projects.filter(p => !p.status || p.status === 'active').length;

  const planLabel = planTier
    ? planTier.charAt(0).toUpperCase() + planTier.slice(1)
    : 'Free';

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-amber-100 text-amber-700',
    suspended: 'bg-red-100 text-red-700',
  };

  if (!currentOrg) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600">No organisation selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organisation Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your organisation, team, and projects</p>
        </div>
        {organisations.length > 1 && (
          <select
            value={currentOrg.id}
            onChange={e => setCurrentOrg(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
          >
            {organisations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {/* ─── 1. Dashboard Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Users className="h-4 w-4" />
            Team Members
          </div>
          <div className="text-2xl font-bold text-slate-900">{memberCount}</div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            {adminCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">{adminCount} admin{adminCount !== 1 ? 's' : ''}</span>
            )}
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{memberCount - adminCount} member{memberCount - adminCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <FolderOpen className="h-4 w-4" />
            Projects
          </div>
          <div className="text-2xl font-bold text-slate-900">{projects.length}</div>
          <div className="text-xs text-slate-400 mt-2">
            {activeProjects} active
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Package className="h-4 w-4" />
            Plan
          </div>
          <div className="text-2xl font-bold text-slate-900">{planLabel}</div>
          {planStatus && (
            <span className={`inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${statusColors[planStatus] || 'bg-slate-100 text-slate-600'}`}>
              {planStatus}
            </span>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Calendar className="h-4 w-4" />
            Age
          </div>
          <div className="text-2xl font-bold text-slate-900">{daysSinceCreation}</div>
          <div className="text-xs text-slate-400 mt-2">days since creation</div>
        </div>
      </div>

      {/* ─── 6. Quick Actions Bar ─── */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">Quick Actions</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin" className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Create Project
          </a>
          <a href="/admin/security" className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />
            Manage Access
          </a>
          <a href="/governance" className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors">
            <Shield className="h-3.5 w-3.5" />
            Governance
          </a>
          <a href="/admin/security" className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 transition-colors">
            <ClipboardList className="h-3.5 w-3.5" />
            Audit Log
          </a>
        </div>
      </div>

      {/* ─── 5. Organisation Profile ─── */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Organisation Profile</h2>
          </div>
          {!isEditingProfile && (
            <button
              onClick={handleStartEditProfile}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Name row */}
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={e => setEditedName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  disabled={saving}
                />
                <button onClick={handleSaveName} disabled={saving || !editedName.trim()}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition-colors">
                  <Save className="h-4 w-4" />
                </button>
                <button onClick={() => setIsEditingName(false)} disabled={saving}
                  className="px-3 py-2 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{currentOrg.name}</span>
                {isAdmin && !isEditingProfile && (
                  <button onClick={handleStartEditName} className="text-xs text-blue-600 hover:text-blue-700">Edit name</button>
                )}
              </div>
            )}
          </div>

          {/* Profile fields */}
          {isEditingProfile ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Description / Mission</label>
                <textarea
                  value={editedProfile.description}
                  onChange={e => setEditedProfile(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  placeholder="What does your organisation do? Your mission statement..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Country</label>
                  <input
                    type="text"
                    value={editedProfile.country}
                    onChange={e => setEditedProfile(p => ({ ...p, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                    placeholder="e.g., Germany"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Website</label>
                  <input
                    type="url"
                    value={editedProfile.website}
                    onChange={e => setEditedProfile(p => ({ ...p, website: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                    placeholder="https://example.org"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">EU Programme Focus</label>
                <div className="flex flex-wrap gap-1.5">
                  {EU_PROGRAMMES.map(prog => (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => toggleFocusArea(prog)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        editedProfile.focusAreas.includes(prog)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {prog}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button onClick={handleSaveProfile}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Save Profile
                </button>
                <button onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {orgProfile.description && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                  <p className="text-sm text-slate-700 leading-relaxed">{orgProfile.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Country</span>
                  </label>
                  <span className="text-sm text-slate-700">{orgProfile.country || '—'}</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Website</span>
                  </label>
                  {orgProfile.website ? (
                    <a href={orgProfile.website} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                      {orgProfile.website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    <span className="flex items-center gap-1"><Crown className="h-3 w-3" /> Your Role</span>
                  </label>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {currentOrgRole || 'viewer'}
                  </span>
                </div>
              </div>
              {orgProfile.focusAreas.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">EU Programme Focus</label>
                  <div className="flex flex-wrap gap-1.5">
                    {orgProfile.focusAreas.map(area => (
                      <span key={area} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {!orgProfile.description && !orgProfile.country && !orgProfile.website && orgProfile.focusAreas.length === 0 && (
                <div className="text-center py-4">
                  <Sparkles className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Add your organisation's description, country, and focus areas</p>
                  <button onClick={handleStartEditProfile} className="text-xs text-blue-600 hover:text-blue-700 mt-1">
                    Complete Profile
                  </button>
                </div>
              )}
            </>
          )}

          {/* Meta row */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
            <span className="font-mono">ID: {currentOrg.id.slice(0, 8)}...</span>
            <span>Created {currentOrg.created_at
              ? new Date(currentOrg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'N/A'
            }</span>
          </div>
        </div>
      </div>

      {/* ─── 2. Team Members Panel ─── */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
            {memberCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{memberCount}</span>
            )}
          </div>
          <a href="/admin/security" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors">
            <UserPlus className="h-3.5 w-3.5" />
            Manage
          </a>
        </div>

        <div className="p-5">
          {loadingMembers ? (
            <div className="text-center py-4 text-sm text-slate-400">Loading team...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No team members found</p>
              <p className="text-xs text-slate-400 mt-1">Member data may be restricted by security policies</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member, i) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                    member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {member.role === 'admin' ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {member.user_id === profile?.id ? 'You' : `Member ${i + 1}`}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${
                        member.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {member.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Joined {new Date(member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. Projects Overview ─── */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
            {projects.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{projects.length}</span>
            )}
          </div>
          <a href="/admin" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New Project
          </a>
        </div>

        <div className="p-5">
          {loadingProjects ? (
            <div className="text-center py-4 text-sm text-slate-400">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-6">
              <FolderOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No projects yet</p>
              <a href="/admin" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
                Create your first project
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map(project => {
                const isCurrent = project.id === currentProject?.id;
                const statusColor = project.status === 'active' || !project.status
                  ? 'bg-green-100 text-green-700'
                  : project.status === 'completed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600';

                return (
                  <div key={project.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isCurrent ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 truncate">{project.title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${statusColor}`}>
                          {project.status || 'active'}
                        </span>
                        {project.programme_profile && project.programme_profile !== 'Custom' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                            {project.programme_profile}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      {project.description && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{project.description}</p>
                      )}
                    </div>
                    {project.start_date && (
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {new Date(project.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                        {project.end_date && ` — ${new Date(project.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. Plan & Entitlements Summary ─── */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Plan & Entitlements</h2>
          </div>
          <a href="/governance" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors">
            Manage Plan
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="p-5">
          {!planTier ? (
            <div className="text-center py-6">
              <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No plan configured</p>
              <a href="/governance" className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block">
                Set up a plan
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plan badge */}
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-lg text-sm font-bold ${
                  planTier === 'organisation' ? 'bg-purple-100 text-purple-800' :
                  planTier === 'portfolio' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {planLabel} Plan
                </div>
                {planStatus && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[planStatus] || ''}`}>
                    {planStatus}
                  </span>
                )}
              </div>

              {/* Usage bars */}
              {entitlements && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {entitlements.max_projects !== null && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">Projects</span>
                        <span className="font-medium text-slate-800">{projects.length} / {entitlements.max_projects}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            projects.length >= (entitlements.max_projects || 1) ? 'bg-red-500' :
                            projects.length >= (entitlements.max_projects || 1) * 0.8 ? 'bg-amber-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, (projects.length / (entitlements.max_projects || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feature flags */}
              {entitlements && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                  {[
                    { key: 'portfolio_dashboard_enabled', label: 'Portfolio Dashboard' },
                    { key: 'cross_project_reporting_enabled', label: 'Cross-Project Reports' },
                    { key: 'shared_templates_enabled', label: 'Shared Templates' },
                    { key: 'compliance_profiles_enabled', label: 'Compliance Profiles' },
                    { key: 'export_branding_enabled', label: 'Export Branding' },
                    { key: 'org_level_methodology_enabled', label: 'Org Methodology' },
                  ].map(feature => {
                    const enabled = (entitlements as any)[feature.key];
                    return (
                      <div key={feature.key} className="flex items-center gap-1.5 text-xs">
                        {enabled ? (
                          <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                        )}
                        <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>{feature.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
