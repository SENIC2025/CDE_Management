import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import { Plus, Edit, Trash2, BookOpen, Lightbulb, Copy } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { usePermissions } from '../hooks/usePermissions';

export default function Knowledge() {
  const { currentProject } = useProject();
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState<'templates' | 'lessons'>('templates');
  const [templates, setTemplates] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState({ name: '', category: 'objective', description: '', content_json: '{}', is_global: false });
  const [lessonData, setLessonData] = useState({ title: '', description: '', context: '', tags: '', category: 'process' });

  useEffect(() => { if (currentProject) { loadTemplates(); loadLessons(); } }, [currentProject]);

  async function loadTemplates() {
    const { data } = await supabase.from('template_assets').select('*').or(`is_global.eq.true,org_id.eq.${currentProject?.org_id}`).order('created_at', { ascending: false });
    setTemplates(data || []);
  }

  async function loadLessons() {
    const { data } = await supabase.from('lessons_learned').select('*').eq('project_id', currentProject!.id).order('created_at', { ascending: false });
    setLessons(data || []);
  }

  async function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await supabase.from('template_assets').update(templateData).eq('id', editingId);
    else await supabase.from('template_assets').insert({ ...templateData, org_id: currentProject!.org_id });
    setTemplateData({ name: '', category: 'objective', description: '', content_json: '{}', is_global: false });
    setEditingId(null);
    setShowTemplateForm(false);
    loadTemplates();
  }

  async function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) await supabase.from('lessons_learned').update(lessonData).eq('id', editingId);
    else await supabase.from('lessons_learned').insert({ ...lessonData, project_id: currentProject!.id });
    setLessonData({ title: '', description: '', context: '', tags: '', category: 'process' });
    setEditingId(null);
    setShowLessonForm(false);
    loadLessons();
  }

  async function handleDelete(id: string, type: 'template' | 'lesson') {
    if (confirm(`Delete ${type}?`)) {
      await supabase.from(type === 'template' ? 'template_assets' : 'lessons_learned').delete().eq('id', id);
      if (type === 'template') loadTemplates();
      else loadLessons();
    }
  }

  async function applyTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (!template || !currentProject) return;

    try {
      const content = JSON.parse(template.content_json);

      if (template.category === 'objective') {
        await supabase.from('cde_objectives').insert(content.map((item: any) => ({ ...item, project_id: currentProject.id })));
      } else if (template.category === 'stakeholder') {
        await supabase.from('stakeholders').insert(content.map((item: any) => ({ ...item, project_id: currentProject.id })));
      } else if (template.category === 'activity') {
        await supabase.from('activities').insert(content.map((item: any) => ({ ...item, project_id: currentProject.id })));
      } else if (template.category === 'indicator') {
        await supabase.from('indicators').insert(content.map((item: any) => ({ ...item, project_id: currentProject.id })));
      }

      alert('Template applied successfully!');
    } catch (error) {
      alert('Error applying template. Check the content JSON format.');
    }
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!categoryFilter || t.category === categoryFilter)
  );
  const filteredLessons = lessons.filter(l =>
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!categoryFilter || l.category === categoryFilter)
  );

  const categories = ['objective', 'stakeholder', 'message', 'activity', 'channel', 'indicator'];
  const lessonCategories = ['process', 'technical', 'stakeholder', 'communication'];

  if (!currentProject) return <div className="text-center py-12"><p className="text-slate-600">Select a project</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-slate-900">Knowledge Base & Reuse Library</h1><p className="text-slate-600 mt-1">Templates and lessons learned</p></div>
        <button onClick={() => activeTab === 'templates' ? setShowTemplateForm(true) : setShowLessonForm(true)} disabled={activeTab === 'templates' ? !permissions.canManageTemplates() : !permissions.canCreate()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"><Plus size={20} />New</button>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 font-medium ${activeTab === 'templates' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Templates</button>
        <button onClick={() => setActiveTab('lessons')} className={`px-4 py-2 font-medium ${activeTab === 'lessons' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-600'}`}>Lessons Learned</button>
      </div>

      <div className="bg-slate-50 border rounded p-4 grid grid-cols-4 gap-3">
        <div><label className="block text-xs font-medium mb-1">Category</label><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-3 py-2 text-sm border rounded"><option value="">All</option>{(activeTab === 'templates' ? categories : lessonCategories).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
        <div className="col-span-3"><label className="block text-xs font-medium mb-1">Search</label><SearchBar value={searchTerm} onChange={setSearchTerm} /></div>
      </div>

      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Template Library</h2></div>
          {filteredTemplates.length === 0 ? <div className="p-6 text-center text-slate-600">No templates</div> : (
            <div className="divide-y">
              {filteredTemplates.map(template => (
                <div key={template.id} className="p-6 hover:bg-slate-50 flex justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <BookOpen size={20} className="text-slate-400 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{template.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{template.category}</span>
                        {template.is_global && <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Global</span>}
                      </div>
                      {template.description && <p className="text-sm text-slate-600">{template.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => applyTemplate(template.id)} className="text-green-600 hover:text-green-700 disabled:text-slate-400 disabled:cursor-not-allowed" title="Apply to project" disabled={!permissions.canCreate()}><Copy size={18} /></button>
                    <button onClick={() => { setTemplateData({ name: template.name, category: template.category, description: template.description, content_json: template.content_json, is_global: template.is_global }); setEditingId(template.id); setShowTemplateForm(true); }} className="text-blue-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!permissions.canManageTemplates()}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(template.id, 'template')} className="text-red-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!permissions.canManageTemplates()}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lessons' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b"><h2 className="text-lg font-semibold">Lessons Learned</h2></div>
          {filteredLessons.length === 0 ? <div className="p-6 text-center text-slate-600">No lessons</div> : (
            <div className="divide-y">
              {filteredLessons.map(lesson => (
                <div key={lesson.id} className="p-6 hover:bg-slate-50 flex justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Lightbulb size={20} className="text-slate-400 mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">{lesson.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{lesson.category}</span>
                      </div>
                      {lesson.description && <p className="text-sm text-slate-600">{lesson.description}</p>}
                      {lesson.context && <p className="text-xs text-slate-500 mt-1">Context: {lesson.context}</p>}
                      {lesson.tags && <div className="flex gap-1 mt-2">{lesson.tags.split(',').map((tag: string, i: number) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{tag.trim()}</span>)}</div>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setLessonData({ title: lesson.title, description: lesson.description, context: lesson.context, tags: lesson.tags, category: lesson.category }); setEditingId(lesson.id); setShowLessonForm(true); }} className="text-blue-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!permissions.canUpdate()}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(lesson.id, 'lesson')} className="text-red-600 disabled:text-slate-400 disabled:cursor-not-allowed" disabled={!permissions.canDelete()}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showTemplateForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Template</h3></div>
            <form onSubmit={handleTemplateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Name</label><input type="text" required value={templateData.name} onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Category</label><select required value={templateData.category} onChange={(e) => setTemplateData({ ...templateData, category: e.target.value })} className="w-full px-3 py-2 border rounded">{categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
                <div><label className="flex items-center gap-2 mt-8"><input type="checkbox" checked={templateData.is_global} onChange={(e) => setTemplateData({ ...templateData, is_global: e.target.checked })} className="rounded" /><span className="text-sm">Global template</span></label></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={templateData.description} onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Content JSON</label><textarea value={templateData.content_json} onChange={(e) => setTemplateData({ ...templateData, content_json: e.target.value })} rows={8} className="w-full px-3 py-2 border rounded font-mono text-sm" placeholder='[{"title": "...", "description": "..."}]' /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowTemplateForm(false); setEditingId(null); }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLessonForm && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b"><h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'New'} Lesson</h3></div>
            <form onSubmit={handleLessonSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title</label><input type="text" required value={lessonData.title} onChange={(e) => setLessonData({ ...lessonData, title: e.target.value })} className="w-full px-3 py-2 border rounded" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea required value={lessonData.description} onChange={(e) => setLessonData({ ...lessonData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded" /></div>
                <div><label className="block text-sm font-medium mb-1">Category</label><select required value={lessonData.category} onChange={(e) => setLessonData({ ...lessonData, category: e.target.value })} className="w-full px-3 py-2 border rounded">{lessonCategories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Tags (comma-separated)</label><input type="text" value={lessonData.tags} onChange={(e) => setLessonData({ ...lessonData, tags: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="planning, risk, budget" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Context</label><textarea value={lessonData.context} onChange={(e) => setLessonData({ ...lessonData, context: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded" /></div>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{editingId ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => { setShowLessonForm(false); setEditingId(null); }} className="bg-slate-200 text-slate-700 px-4 py-2 rounded hover:bg-slate-300">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
