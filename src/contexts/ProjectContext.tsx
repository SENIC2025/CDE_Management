import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
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
  selectProject: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.org_id) {
      loadProjects();
    }
  }, [profile]);

  useEffect(() => {
    if (currentProject && profile) {
      loadUserRole(currentProject.id, profile.id);
    }
  }, [currentProject, profile]);

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('org_id', profile!.org_id)
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

  return (
    <ProjectContext.Provider value={{ currentProject, projects, userRole, loading, selectProject, refreshProjects }}>
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
