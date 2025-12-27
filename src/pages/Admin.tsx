import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { logAuditEvent } from '../lib/audit';
import { Plus, Lock, AlertCircle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  programme_profile: string;
  start_date: string;
  end_date: string;
  eu_compliance_enabled: boolean;
}

const PROGRAMME_PROFILES = ['Custom', 'Horizon Europe', 'Erasmus+', 'Interreg'];

export default function Admin() {
  const { profile } = useAuth();
  const { refreshProjects } = useProject();
  const { service: entitlementsService } = useEntitlements();
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    programme_profile: 'Custom',
    start_date: '',
    end_date: '',
    eu_compliance_enabled: false,
  });
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    type: 'beneficiary',
    country: '',
    contact_name: '',
    contact_email: '',
  });

  useEffect(() => {
    if (profile?.org_id) {
      loadProjects();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedProject) {
      loadPartners(selectedProject);
    }
  }, [selectedProject]);

  async function loadProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('org_id', profile!.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading projects:', error);
      return;
    }

    setProjects(data || []);
    if (data && data.length > 0 && !selectedProject) {
      setSelectedProject(data[0].id);
    }
  }

  async function loadPartners(projectId: string) {
    const { data, error } = await supabase
      .from('partners')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading partners:', error);
      return;
    }

    setPartners(data || []);
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (!profile?.org_id) {
        alert('No organisation found. Please wait while your organisation is being set up, then try again.');
        return;
      }

      if (entitlementsService) {
        const check = entitlementsService.canCreateProject(projects.length);
        if (!check.allowed) {
          alert(check.reason || 'Cannot create project');
          await logAuditEvent(
            profile.org_id,
            null,
            profile.id,
            'project',
            '',
            'denied',
            undefined,
            { reason: check.reason, action: 'create_project' }
          );
          return;
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...formData,
          org_id: profile.org_id,
          reporting_periods: [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        alert('Failed to create project: ' + error.message);
        return;
      }

      setShowProjectForm(false);
      setFormData({
        title: '',
        description: '',
        programme_profile: 'Custom',
        start_date: '',
        end_date: '',
        eu_compliance_enabled: false,
      });

      await Promise.all([loadProjects(), refreshProjects()]);

      if (data) {
        alert(`Project "${data.title}" created successfully! You are now the coordinator.`);
      }
    } catch (error) {
      console.error('Error in project creation:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  }

  async function handleCreatePartner(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from('partners').insert({
      ...partnerForm,
      project_id: selectedProject,
    });

    if (error) {
      console.error('Error creating partner:', error);
      return;
    }

    setShowPartnerForm(false);
    setPartnerForm({
      name: '',
      type: 'beneficiary',
      country: '',
      contact_name: '',
      contact_email: '',
    });
    loadPartners(selectedProject);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin & Configuration</h1>
          <p className="text-slate-600 mt-1">Manage projects, partners, and settings</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
            <button
              onClick={() => {
                if (!profile?.org_id) {
                  alert('No organisation found. Please wait while your organisation is being set up, then try again.');
                  return;
                }
                if (entitlementsService) {
                  const check = entitlementsService.canCreateProject(projects.length);
                  if (!check.allowed) {
                    alert(check.reason);
                    return;
                  }
                }
                setShowProjectForm(true);
              }}
              disabled={entitlementsService && !entitlementsService.canCreateProject(projects.length).allowed}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
              title={entitlementsService && !entitlementsService.canCreateProject(projects.length).allowed ? entitlementsService.canCreateProject(projects.length).reason : ''}
            >
              {entitlementsService && !entitlementsService.canCreateProject(projects.length).allowed ? (
                <>
                  <Lock size={20} />
                  Limit Reached
                </>
              ) : (
                <>
                  <Plus size={20} />
                  New Project
                </>
              )}
            </button>
          </div>
          {entitlementsService && !entitlementsService.canCreateProject(projects.length).allowed && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-600" />
              <div className="text-sm">
                <p className="text-orange-800 font-medium">Project limit reached</p>
                <p className="text-orange-600">{entitlementsService.canCreateProject(projects.length).reason} Visit Plans & Governance to upgrade.</p>
              </div>
            </div>
          )}
        </div>

        {showProjectForm && (
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-4">Create New Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Programme Profile
                  </label>
                  <select
                    value={formData.programme_profile}
                    onChange={(e) => setFormData({ ...formData, programme_profile: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PROGRAMME_PROFILES.map((profile) => (
                      <option key={profile} value={profile}>{profile}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.eu_compliance_enabled}
                      onChange={(e) => setFormData({ ...formData, eu_compliance_enabled: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-slate-700">Enable EU Compliance Checker</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowProjectForm(false)}
                  className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-slate-200">
          {projects.map((project) => (
            <div key={project.id} className="p-6 hover:bg-slate-50 transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{project.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">{project.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded">{project.programme_profile}</span>
                    <span>
                      {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                    </span>
                    {project.eu_compliance_enabled && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Compliance Enabled</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProject(project.id)}
                  className={`px-3 py-1 rounded-md text-sm transition ${
                    selectedProject === project.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedProject && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Partners</h2>
            <button
              onClick={() => setShowPartnerForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Add Partner
            </button>
          </div>

          {showPartnerForm && (
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-4">Add Partner</h3>
              <form onSubmit={handleCreatePartner} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Partner Name
                    </label>
                    <input
                      type="text"
                      required
                      value={partnerForm.name}
                      onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Type
                    </label>
                    <select
                      value={partnerForm.type}
                      onChange={(e) => setPartnerForm({ ...partnerForm, type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="beneficiary">Beneficiary</option>
                      <option value="affiliated">Affiliated Entity</option>
                      <option value="associated">Associated Partner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={partnerForm.country}
                      onChange={(e) => setPartnerForm({ ...partnerForm, country: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={partnerForm.contact_name}
                      onChange={(e) => setPartnerForm({ ...partnerForm, contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={partnerForm.contact_email}
                      onChange={(e) => setPartnerForm({ ...partnerForm, contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                  >
                    Add Partner
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPartnerForm(false)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="divide-y divide-slate-200">
            {partners.length === 0 ? (
              <div className="p-6 text-center text-slate-600">
                No partners added yet
              </div>
            ) : (
              partners.map((partner) => (
                <div key={partner.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{partner.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">{partner.type}</span>
                        {partner.country && <span>{partner.country}</span>}
                      </div>
                      {partner.contact_name && (
                        <div className="mt-2 text-sm text-slate-600">
                          Contact: {partner.contact_name}
                          {partner.contact_email && ` (${partner.contact_email})`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
