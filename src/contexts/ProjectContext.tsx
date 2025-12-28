import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useOrganisation } from './OrganisationContext';
import { Role } from '../lib/rbac';

interface Project {
  id: string;
  org_id: string;
  title: string;
  description: string;
  programme_profile: string;
  start_date: string;
  end_date: string;
  reporting_periods: any[];
  eu_compliance_enabled: boolean;
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  userRole: Role | null;
  loading: boolean;
  showFirstProjectToast: boolean;
  selectProject: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
  dismissFirstProjectToast: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { currentOrg, firstProjectId, clearFirstProject } = useOrganisation();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFirstProjectToast, setShowFirstProjectToast] = useState(false);

  useEffect(() => {
    if (currentOrg?.id) {
      loadProjects();
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    if (currentProject && profile) {
      loadUserRole(currentProject.id, profile.id);
    }
  }, [currentProject, profile]);

  useEffect(() => {
    if (firstProjectId && projects.length > 0) {
      const newProject = projects.find(p => p.id === firstProjectId);
      if (newProject) {
        setCurrentProject(newProject);
        localStorage.setItem('currentProjectId', firstProjectId);
        setShowFirstProjectToast(true);
        clearFirstProject();
      }
    }
  }, [firstProjectId, projects]);

  async function loadProjects() {
    if (!currentOrg?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);

      const savedProjectId = localStorage.getItem('currentProjectId');
      if (savedProjectId && data?.find(p => p.id === savedProjectId)) {
        setCurrentProject(data.find(p => p.id === savedProjectId)!);
      } else if (data && data.length > 0) {
        setCurrentProject(data[0]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserRole(projectId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('project_memberships')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      setUserRole((data?.role as Role) || 'viewer');
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('viewer');
    }
  }

  function selectProject(projectId: string) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      localStorage.setItem('currentProjectId', projectId);
    }
  }

  async function refreshProjects() {
    await loadProjects();
  }

  function dismissFirstProjectToast() {
    setShowFirstProjectToast(false);
  }

  return (
    <ProjectContext.Provider value={{ currentProject, projects, userRole, loading, showFirstProjectToast, selectProject, refreshProjects, dismissFirstProjectToast }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
