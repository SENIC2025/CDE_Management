import { useProject } from '../contexts/ProjectContext';

export default function ProjectSwitcher() {
  const { currentProject, projects, selectProject, loading } = useProject();

  if (loading) {
    return (
      <div className="p-4 border-b border-slate-800">
        <div className="text-xs text-slate-400 mb-1">Project</div>
        <div className="text-sm text-slate-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-slate-800">
      <div className="text-xs text-slate-400 mb-1">Project</div>
      <select
        value={currentProject?.id || ''}
        onChange={(e) => selectProject(e.target.value)}
        className="w-full bg-slate-800 text-white px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {projects.length === 0 && <option value="">No projects</option>}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.title}
          </option>
        ))}
      </select>
    </div>
  );
}
