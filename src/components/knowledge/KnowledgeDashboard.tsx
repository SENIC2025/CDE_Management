import {
  BookOpen,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  BarChart3,
  Zap,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface KnowledgeDashboardProps {
  templates: any[];
  lessons: any[];
  projectGaps: {
    hasObjectives: boolean;
    hasStakeholders: boolean;
    hasActivities: boolean;
    hasIndicators: boolean;
    hasChannels: boolean;
  };
  applicationCount: number;
  onSuggestionClick: (category: string) => void;
}

export default function KnowledgeDashboard({
  templates,
  lessons,
  projectGaps,
  applicationCount,
  onSuggestionClick
}: KnowledgeDashboardProps) {
  const globalTemplates = templates.filter(t => t.is_global).length;
  const orgTemplates = templates.length - globalTemplates;

  const categoryCounts = templates.reduce((acc: Record<string, number>, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});

  const lessonCategoryCounts = lessons.reduce((acc: Record<string, number>, l) => {
    acc[l.category] = (acc[l.category] || 0) + 1;
    return acc;
  }, {});

  // Smart suggestions based on project gaps
  const suggestions: { icon: React.ReactNode; text: string; category: string; color: string }[] = [];

  if (!projectGaps.hasObjectives) {
    suggestions.push({
      icon: <Target className="h-4 w-4" />,
      text: 'No objectives yet — try an objective template to get started',
      category: 'objective',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    });
  }
  if (!projectGaps.hasStakeholders) {
    suggestions.push({
      icon: <Users className="h-4 w-4" />,
      text: 'No stakeholders mapped — use a stakeholder template',
      category: 'stakeholder',
      color: 'text-green-600 bg-green-50 border-green-200'
    });
  }
  if (!projectGaps.hasActivities) {
    suggestions.push({
      icon: <BarChart3 className="h-4 w-4" />,
      text: 'No activities planned — apply an activity template',
      category: 'activity',
      color: 'text-orange-600 bg-orange-50 border-orange-200'
    });
  }
  if (!projectGaps.hasIndicators) {
    suggestions.push({
      icon: <TrendingUp className="h-4 w-4" />,
      text: 'No KPIs set — try an indicator template',
      category: 'indicator',
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200'
    });
  }
  if (!projectGaps.hasChannels) {
    suggestions.push({
      icon: <Zap className="h-4 w-4" />,
      text: 'No channels defined — use a channel template',
      category: 'channel',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    });
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <BookOpen className="h-4 w-4" />
            Templates
          </div>
          <div className="text-2xl font-bold text-slate-900">{templates.length}</div>
          <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
            {orgTemplates > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">{orgTemplates} org</span>
            )}
            {globalTemplates > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-600">{globalTemplates} global</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Lightbulb className="h-4 w-4" />
            Lessons Learned
          </div>
          <div className="text-2xl font-bold text-slate-900">{lessons.length}</div>
          <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
            {Object.entries(lessonCategoryCounts).slice(0, 3).map(([cat, count]) => (
              <span key={cat} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {count} {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            Applied
          </div>
          <div className="text-2xl font-bold text-slate-900">{applicationCount}</div>
          <div className="text-xs text-slate-400 mt-2">
            Templates applied to this project
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <BookOpen className="h-4 w-4" />
            By Category
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {Object.entries(categoryCounts).map(([cat, count]) => (
              <span key={cat} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-xs">
                {cat} ({count})
              </span>
            ))}
            {Object.keys(categoryCounts).length === 0 && (
              <span className="text-xs text-slate-400">No templates yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-slate-800">Quick Start Suggestions</span>
            <span className="text-xs text-amber-600">Based on your project gaps</span>
          </div>
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(suggestion.category)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left text-sm transition-all hover:shadow-sm ${suggestion.color}`}
              >
                {suggestion.icon}
                <span className="flex-1">{suggestion.text}</span>
                <ArrowRight className="h-4 w-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
