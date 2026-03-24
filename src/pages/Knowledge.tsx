import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../contexts/ProjectContext';
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Lightbulb,
  Eye,
  Search,
  X,
  Globe,
  Award,
  History,
  Target,
  Users,
  BarChart3,
  Zap,
  FileText,
  ChevronDown,
  Clock,
  AlertTriangle
} from 'lucide-react';
import KnowledgeDashboard from '../components/knowledge/KnowledgeDashboard';
import TemplateBuilder from '../components/knowledge/TemplateBuilder';
import TemplatePreviewModal from '../components/knowledge/TemplatePreviewModal';
import BestPracticesLibrary from '../components/knowledge/BestPracticesLibrary';
import ApplicationHistory from '../components/knowledge/ApplicationHistory';
import { PageHeader, ConfirmDialog } from '../components/ui';
import useConfirm from '../hooks/useConfirm';
import { TemplateApplicationStore, TemplateStore } from '../lib/knowledgeData';

type TabId = 'templates' | 'lessons' | 'org-lessons' | 'best-practices' | 'history';

const categoryIcons: Record<string, React.ReactNode> = {
  objective: <Target className="h-4 w-4 text-blue-500" />,
  stakeholder: <Users className="h-4 w-4 text-green-500" />,
  activity: <BarChart3 className="h-4 w-4 text-orange-500" />,
  indicator: <BarChart3 className="h-4 w-4 text-cyan-500" />,
  message: <FileText className="h-4 w-4 text-purple-500" />,
  channel: <Zap className="h-4 w-4 text-yellow-500" />
};

const categories = ['objective', 'stakeholder', 'message', 'activity', 'channel', 'indicator'];
const lessonCategories = ['process', 'technical', 'stakeholder', 'communication', 'management', 'reporting'];
const impactLevels = ['high', 'medium', 'low'];

// ─── DB Column Mapping for lessons_learned ───
// lessons_learned actual cols: id, project_id, title, description, context, tags, category, created_at, updated_at
// Extra fields (impact, recommendation, is_org_wide) are encoded as JSON in the tags column.

function normalizeLesson(row: any) {
  let userTags = row.tags || '';
  let impact = '';
  let recommendation = '';
  let isOrgWide = false;
  try {
    if (typeof row.tags === 'string' && row.tags.startsWith('{')) {
      const meta = JSON.parse(row.tags);
      if (meta && typeof meta === 'object') {
        userTags = meta.userTags || '';
        impact = meta.impact || '';
        recommendation = meta.recommendation || '';
        isOrgWide = meta.is_org_wide || false;
      }
    }
  } catch { /* legacy plain text tags — keep as-is */ }
  return { ...row, tags: userTags, impact, recommendation, is_org_wide: isOrgWide };
}

export default function Knowledge() {
  const { currentProject } = useProject();
  const [confirmProps, confirm] = useConfirm();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('templates');

  // Data
  const [templates, setTemplates] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [orgLessons, setOrgLessons] = useState<any[]>([]);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('objective');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIsGlobal, setTemplateIsGlobal] = useState(false);
  const [templateItems, setTemplateItems] = useState<Record<string, any>[]>([]);
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('[]');

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonContext, setLessonContext] = useState('');
  const [lessonTags, setLessonTags] = useState('');
  const [lessonCategory, setLessonCategory] = useState('process');
  const [lessonImpact, setLessonImpact] = useState('medium');
  const [lessonRecommendation, setLessonRecommendation] = useState('');
  const [lessonIsOrgWide, setLessonIsOrgWide] = useState(false);

  // Template preview
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  // Project gaps
  const [projectGaps, setProjectGaps] = useState({
    hasObjectives: true, hasStakeholders: true, hasActivities: true,
    hasIndicators: true, hasChannels: true
  });

  // Template store (localStorage — avoids DB schema issues)
  const templateStore = useMemo(
    () => currentProject?.org_id ? new TemplateStore(currentProject.org_id) : null,
    [currentProject?.org_id]
  );

  // Application history
  const historyStore = useMemo(
    () => currentProject ? new TemplateApplicationStore(currentProject.id) : null,
    [currentProject?.id]
  );
  const [applicationHistory, setApplicationHistory] = useState<any[]>([]);

  // Load data
  useEffect(() => {
    if (currentProject) {
      loadTemplates();
      loadLessons();
      loadOrgLessons();
      loadProjectGaps();
      loadHistory();
    }
  }, [currentProject]);

  function loadTemplates() {
    if (templateStore) {
      setTemplates(templateStore.getAll());
    }
  }

  async function loadLessons() {
    const { data } = await supabase
      .from('lessons_learned')
      .select('*')
      .eq('project_id', currentProject!.id)
      .order('created_at', { ascending: false });
    setLessons((data || []).map(normalizeLesson));
  }

  async function loadOrgLessons() {
    // Fetch lessons from OTHER projects (is_org_wide is stored in tags JSON, so filter client-side)
    const { data } = await supabase
      .from('lessons_learned')
      .select('*')
      .neq('project_id', currentProject!.id)
      .order('created_at', { ascending: false });
    const normalized = (data || []).map(normalizeLesson);
    setOrgLessons(normalized.filter(l => l.is_org_wide));
  }

  async function loadProjectGaps() {
    if (!currentProject) return;
    const pid = currentProject.id;
    const [obj, sth, act, ind, ch] = await Promise.all([
      supabase.from('cde_objectives').select('id').eq('project_id', pid).limit(1),
      supabase.from('stakeholder_groups').select('id').eq('project_id', pid).limit(1),
      supabase.from('activities').select('id').eq('project_id', pid).limit(1),
      supabase.from('indicators').select('id').eq('project_id', pid).limit(1),
      supabase.from('channels').select('id').eq('project_id', pid).limit(1)
    ]);
    setProjectGaps({
      hasObjectives: (obj.data?.length || 0) > 0,
      hasStakeholders: (sth.data?.length || 0) > 0,
      hasActivities: (act.data?.length || 0) > 0,
      hasIndicators: (ind.data?.length || 0) > 0,
      hasChannels: (ch.data?.length || 0) > 0
    });
  }

  function loadHistory() {
    if (historyStore) {
      setApplicationHistory(historyStore.getAll());
    }
  }

  // ─── Template CRUD ───

  function openNewTemplate(prefillCategory?: string) {
    setEditingId(null);
    setTemplateName('');
    setTemplateCategory(prefillCategory || 'objective');
    setTemplateDescription('');
    setTemplateIsGlobal(false);
    setTemplateItems([]);
    setRawJsonText('[]');
    setShowRawJson(false);
    setShowTemplateForm(true);
  }

  function openEditTemplate(template: any) {
    setEditingId(template.id);
    setTemplateName(template.name);
    setTemplateCategory(template.category);
    setTemplateDescription(template.description || '');
    setTemplateIsGlobal(template.is_global || false);
    setShowRawJson(false);

    // Parse existing content
    try {
      const parsed = JSON.parse(template.content_json || '[]');
      const items = Array.isArray(parsed) ? parsed : [];
      setTemplateItems(items);
      setRawJsonText(JSON.stringify(items, null, 2));
    } catch {
      setTemplateItems([]);
      setRawJsonText(template.content_json || '[]');
      setShowRawJson(true); // Fall back to raw if can't parse
    }

    setShowTemplateForm(true);
  }

  function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateStore || !currentProject) return;

    // Build items from builder or raw text
    let items: any[];
    if (showRawJson) {
      try { items = JSON.parse(rawJsonText); } catch { items = []; }
      if (!Array.isArray(items)) items = [];
    } else {
      items = templateItems;
    }

    const contentJson = JSON.stringify(items);

    try {
      if (editingId) {
        templateStore.update(editingId, {
          name: templateName,
          category: templateCategory,
          description: templateDescription,
          content_json: contentJson,
          is_global: templateIsGlobal
        });
      } else {
        templateStore.add({
          name: templateName,
          category: templateCategory,
          description: templateDescription,
          content_json: contentJson,
          is_global: templateIsGlobal,
          org_id: currentProject.org_id
        });
      }

      setShowTemplateForm(false);
      setEditingId(null);
      loadTemplates();
    } catch (err) {
      console.error('Template save error:', err);
      alert('Failed to save template. Please try again.');
    }
  }

  // ─── Template Apply (with history) ───

  async function applyTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId);
    if (!template || !currentProject) return;

    try {
      const content = JSON.parse(template.content_json);
      const items = Array.isArray(content) ? content : [];
      let created = 0;

      if (template.category === 'objective') {
        const { data } = await supabase.from('cde_objectives').insert(
          items.map((item: any) => ({ ...item, project_id: currentProject.id }))
        ).select();
        created = data?.length || items.length;
      } else if (template.category === 'stakeholder') {
        const { data } = await supabase.from('stakeholder_groups').insert(
          items.map((item: any) => ({ ...item, project_id: currentProject.id }))
        ).select();
        created = data?.length || items.length;
      } else if (template.category === 'activity') {
        const { data } = await supabase.from('activities').insert(
          items.map((item: any) => ({ ...item, project_id: currentProject.id }))
        ).select();
        created = data?.length || items.length;
      } else if (template.category === 'indicator') {
        const { data } = await supabase.from('indicators').insert(
          items.map((item: any) => ({ ...item, project_id: currentProject.id }))
        ).select();
        created = data?.length || items.length;
      }

      // Log to application history
      if (historyStore) {
        historyStore.add({
          templateId: template.id,
          templateName: template.name,
          templateCategory: template.category,
          projectId: currentProject.id,
          itemsCreated: created
        });
        loadHistory();
      }

      // Refresh project gaps
      loadProjectGaps();

      // Close preview if open
      setPreviewTemplateId(null);
    } catch (error) {
      console.error('Error applying template:', error);
      throw error;
    }
  }

  // ─── Lesson CRUD ───

  function openNewLesson() {
    setEditingId(null);
    setLessonTitle('');
    setLessonDescription('');
    setLessonContext('');
    setLessonTags('');
    setLessonCategory('process');
    setLessonImpact('medium');
    setLessonRecommendation('');
    setLessonIsOrgWide(false);
    setShowLessonForm(true);
  }

  function openEditLesson(lesson: any) {
    setEditingId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || '');
    setLessonContext(lesson.context || '');
    setLessonTags(lesson.tags || '');
    setLessonCategory(lesson.category || 'process');
    setLessonImpact(lesson.impact || 'medium');
    setLessonRecommendation(lesson.recommendation || '');
    setLessonIsOrgWide(lesson.is_org_wide || false);
    setShowLessonForm(true);
  }

  async function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Encode extra fields (impact, recommendation, is_org_wide) into tags JSON
    // DB only has: title, description, context, tags (text), category
    const payload = {
      title: lessonTitle,
      description: lessonDescription,
      context: lessonContext,
      tags: JSON.stringify({
        userTags: lessonTags,
        impact: lessonImpact,
        recommendation: lessonRecommendation,
        is_org_wide: lessonIsOrgWide
      }),
      category: lessonCategory
    };

    try {
      let error;
      if (editingId) {
        ({ error } = await supabase.from('lessons_learned').update(payload).eq('id', editingId));
      } else {
        ({ error } = await supabase.from('lessons_learned').insert({ ...payload, project_id: currentProject!.id }));
      }

      if (error) {
        console.error('Lesson save error:', error);
        alert(`Failed to save lesson: ${error.message}`);
        return;
      }

      setShowLessonForm(false);
      setEditingId(null);
      loadLessons();
      if (lessonIsOrgWide) loadOrgLessons();
    } catch (err) {
      console.error('Lesson save error:', err);
      alert('Failed to save lesson. Please try again.');
    }
  }

  async function handleDelete(id: string, type: 'template' | 'lesson') {
    const ok = await confirm({ title: `Delete ${type}?`, message: `This ${type} will be permanently removed. This cannot be undone.` });
    if (!ok) return;
    if (type === 'template') {
      templateStore?.delete(id);
      loadTemplates();
    } else {
      await supabase.from('lessons_learned').delete().eq('id', id);
      loadLessons();
      loadOrgLessons();
    }
  }

  // ─── Filtering ───

  const filteredTemplates = useMemo(() =>
    templates.filter(t =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!categoryFilter || t.category === categoryFilter)
    ),
    [templates, searchTerm, categoryFilter]
  );

  const filteredLessons = useMemo(() =>
    lessons.filter(l =>
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!categoryFilter || l.category === categoryFilter)
    ),
    [lessons, searchTerm, categoryFilter]
  );

  const filteredOrgLessons = useMemo(() =>
    orgLessons.filter(l =>
      l.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (!categoryFilter || l.category === categoryFilter)
    ),
    [orgLessons, searchTerm, categoryFilter]
  );

  // Category options depending on active tab
  const currentCategories = activeTab === 'templates' ? categories : lessonCategories;

  // ─── Helpers ───

  function getItemCount(template: any): number {
    try {
      const parsed = JSON.parse(template.content_json || '[]');
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  const impactColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700'
  };

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Select a project to view the knowledge base</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Knowledge Base"
        subtitle="Templates, lessons learned, and best practices"
        actions={
          <div className="flex items-center gap-2">
            {(activeTab === 'templates') && (
              <button
                onClick={() => openNewTemplate()}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-[#1BAE70] text-white rounded-lg hover:bg-[#06752E] font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Template
              </button>
            )}
            {(activeTab === 'lessons' || activeTab === 'org-lessons') && (
              <button
                onClick={openNewLesson}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm bg-[#1BAE70] text-white rounded-lg hover:bg-[#06752E] font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Lesson
              </button>
            )}
          </div>
        }
      />

      {/* Dashboard */}
      <KnowledgeDashboard
        templates={templates}
        lessons={lessons}
        projectGaps={projectGaps}
        applicationCount={applicationHistory.length}
        onSuggestionClick={(category) => {
          setCategoryFilter(category);
          setActiveTab('templates');
        }}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'templates' as TabId, label: 'Templates', icon: <BookOpen className="h-4 w-4" />, count: templates.length },
          { id: 'lessons' as TabId, label: 'My Lessons', icon: <Lightbulb className="h-4 w-4" />, count: lessons.length },
          { id: 'org-lessons' as TabId, label: 'Org Library', icon: <Globe className="h-4 w-4" />, count: orgLessons.length },
          { id: 'best-practices' as TabId, label: 'Best Practices', icon: <Award className="h-4 w-4" /> },
          { id: 'history' as TabId, label: 'History', icon: <History className="h-4 w-4" />, count: applicationHistory.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setCategoryFilter(''); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filter (not shown for best-practices which has its own filters) */}
      {activeTab !== 'best-practices' && activeTab !== 'history' && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={`Search ${activeTab === 'templates' ? 'templates' : 'lessons'}...`}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
            />
          </div>
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !categoryFilter ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {currentCategories.map(c => (
              <button
                key={c}
                onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  categoryFilter === c ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── TEMPLATES TAB ─── */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg border border-slate-200">
          {filteredTemplates.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {templates.length === 0
                  ? 'No templates yet. Create your first one.'
                  : 'No templates match your search.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTemplates.map(template => {
                const itemCount = getItemCount(template);
                const wasApplied = historyStore?.hasBeenApplied(template.id);

                return (
                  <div key={template.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {categoryIcons[template.category] || <BookOpen className="h-4 w-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900">{template.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            {template.category}
                          </span>
                          {template.is_global && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                              Global
                            </span>
                          )}
                          {itemCount > 0 && (
                            <span className="text-[10px] text-slate-400">{itemCount} items</span>
                          )}
                          {wasApplied && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              Applied
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Created {new Date(template.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreviewTemplateId(template.id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview & Apply"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditTemplate(template)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id, 'template')}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MY LESSONS TAB ─── */}
      {activeTab === 'lessons' && (
        <div className="bg-white rounded-lg border border-slate-200">
          {filteredLessons.length === 0 ? (
            <div className="p-8 text-center">
              <Lightbulb className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {lessons.length === 0
                  ? 'No lessons recorded yet. Capture what you learn as you go.'
                  : 'No lessons match your search.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLessons.map(lesson => renderLessonCard(lesson, true))}
            </div>
          )}
        </div>
      )}

      {/* ─── ORG LIBRARY TAB ─── */}
      {activeTab === 'org-lessons' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Globe className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Lessons shared by other projects in your organisation. Mark your own lessons as "Share with organisation" to contribute.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            {filteredOrgLessons.length === 0 ? (
              <div className="p-8 text-center">
                <Globe className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No organisation-wide lessons available yet.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  When other projects share their lessons, they will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredOrgLessons.map(lesson => renderLessonCard(lesson, false))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── BEST PRACTICES TAB ─── */}
      {activeTab === 'best-practices' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <BestPracticesLibrary />
        </div>
      )}

      {/* ─── HISTORY TAB ─── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <ApplicationHistory
            history={applicationHistory}
            onClear={() => {
              historyStore?.clear();
              loadHistory();
            }}
          />
        </div>
      )}

      {/* ─── TEMPLATE FORM MODAL ─── */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-xl z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Edit Template' : 'New Template'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Define reusable template items using the visual builder</p>
              </div>
              <button
                onClick={() => { setShowTemplateForm(false); setEditingId(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTemplateSubmit} className="p-5 space-y-5">
              {/* Meta fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                    placeholder="e.g., EU Stakeholder Mapping"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    required
                    value={templateCategory}
                    onChange={e => {
                      setTemplateCategory(e.target.value);
                      // Reset items when category changes (if empty or just started)
                      if (templateItems.length <= 1 && !editingId) {
                        setTemplateItems([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={templateIsGlobal}
                      onChange={e => setTemplateIsGlobal(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Global template</span>
                  </label>
                  <span className="text-[10px] text-slate-400">(visible to all orgs)</span>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    value={templateDescription}
                    onChange={e => setTemplateDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                    placeholder="Brief description of what this template contains..."
                  />
                </div>
              </div>

              {/* Template Content — Visual Builder or Raw JSON */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">Template Items</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (showRawJson) {
                        // Switching to visual — try to parse
                        try {
                          const parsed = JSON.parse(rawJsonText);
                          setTemplateItems(Array.isArray(parsed) ? parsed : []);
                          setShowRawJson(false);
                        } catch {
                          alert('The JSON is invalid. Please fix it before switching to the visual builder.');
                        }
                      } else {
                        // Switching to raw
                        setRawJsonText(JSON.stringify(templateItems, null, 2));
                        setShowRawJson(true);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {showRawJson ? 'Switch to Visual Builder' : 'Switch to Raw JSON'}
                  </button>
                </div>

                {showRawJson ? (
                  <textarea
                    value={rawJsonText}
                    onChange={e => setRawJsonText(e.target.value)}
                    rows={10}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                    placeholder='[{"title": "...", "domain": "communication"}]'
                  />
                ) : (
                  <TemplateBuilder
                    category={templateCategory}
                    items={templateItems}
                    onChange={setTemplateItems}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-400">
                  {showRawJson ? 'Raw JSON mode' : `${templateItems.length} items`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowTemplateForm(false); setEditingId(null); }}
                    className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingId ? 'Save Changes' : 'Create Template'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LESSON FORM MODAL ─── */}
      {showLessonForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Edit Lesson' : 'New Lesson Learned'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Capture knowledge for this project and your organisation</p>
              </div>
              <button
                onClick={() => { setShowLessonForm(false); setEditingId(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleLessonSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  placeholder="e.g., Start stakeholder mapping earlier"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">What happened? (Description)</label>
                <textarea
                  required
                  value={lessonDescription}
                  onChange={e => setLessonDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  placeholder="Describe the situation, what worked or didn't, and why..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recommendation / What to do differently</label>
                <textarea
                  value={lessonRecommendation}
                  onChange={e => setLessonRecommendation(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  placeholder="What should future projects do based on this lesson?"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select
                    required
                    value={lessonCategory}
                    onChange={e => setLessonCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  >
                    {lessonCategories.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Impact Level</label>
                  <select
                    value={lessonImpact}
                    onChange={e => setLessonImpact(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  >
                    {impactLevels.map(l => (
                      <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                  <input
                    type="text"
                    value={lessonTags}
                    onChange={e => setLessonTags(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                    placeholder="risk, budget"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Context</label>
                <textarea
                  value={lessonContext}
                  onChange={e => setLessonContext(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  placeholder="Project phase, timeline, specific circumstances..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lessonIsOrgWide}
                    onChange={e => setLessonIsOrgWide(e.target.checked)}
                    className="rounded border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800">Share with organisation</span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      This lesson will be visible to all projects in your organisation via the Org Library tab.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setShowLessonForm(false); setEditingId(null); }}
                  className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingId ? 'Save Changes' : 'Add Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── TEMPLATE PREVIEW MODAL ─── */}
      {previewTemplateId && (() => {
        const template = templates.find(t => t.id === previewTemplateId);
        if (!template) return null;
        const prevApplications = historyStore?.getApplicationsForTemplate(template.id) || [];

        return (
          <TemplatePreviewModal
            template={template}
            previousApplications={prevApplications}
            onApply={() => applyTemplate(template.id)}
            onClose={() => setPreviewTemplateId(null)}
          />
        );
      })()}
      <ConfirmDialog {...confirmProps} />
    </div>
  );

  // ─── Shared Lesson Card Renderer ───
  function renderLessonCard(lesson: any, canEdit: boolean) {
    return (
      <div key={lesson.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <Lightbulb className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-slate-900">{lesson.title}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {lesson.category}
              </span>
              {lesson.impact && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${impactColors[lesson.impact] || 'bg-slate-100 text-slate-600'}`}>
                  {lesson.impact} impact
                </span>
              )}
              {lesson.is_org_wide && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium flex items-center gap-0.5">
                  <Globe className="h-2.5 w-2.5" />
                  Org-wide
                </span>
              )}
            </div>
            {lesson.description && (
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{lesson.description}</p>
            )}
            {lesson.recommendation && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Recommendation:</strong> {lesson.recommendation}</span>
              </div>
            )}
            {lesson.context && (
              <p className="text-[10px] text-slate-400 mt-1.5">Context: {lesson.context}</p>
            )}
            {lesson.tags && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {lesson.tags.split(',').map((tag: string, i: number) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEditLesson(lesson)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(lesson.id, 'lesson')}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
