import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertCircle, Clock, ShieldX, ExternalLink, Target, Users, MessageSquare, Package, Calendar, Radio, Megaphone, TrendingUp } from 'lucide-react';
import { resolveShareToken, fetchSharedEntity, ENTITY_TYPE_LABELS } from '../lib/shareService';

/**
 * SharedView — Public read-only page for shared items.
 * Accessed via /share/:token — no authentication required.
 * Renders a clean, branded, read-only view of the shared entity.
 */

const ENTITY_ICONS: Record<string, any> = {
  objective: Target,
  stakeholder: Users,
  message: MessageSquare,
  asset: Package,
  activity: Calendar,
  channel: Radio,
  campaign: Megaphone,
  indicator: TrendingUp,
};

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    planned: 'bg-blue-50 text-blue-700',
    active: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    on_hold: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null;
  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
  if (!displayValue) return null;

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm text-gray-900 whitespace-pre-wrap">{displayValue}</dd>
    </div>
  );
}

/** Map entity fields to human-readable labels by entity type */
function getFieldConfig(entityType: string): { key: string; label: string }[] {
  const configs: Record<string, { key: string; label: string }[]> = {
    objective: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'domain', label: 'Domain' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
      { key: 'responsible_person', label: 'Responsible Person' },
      { key: 'target_date', label: 'Target Date' },
      { key: 'notes', label: 'Notes' },
      { key: 'means_of_verification', label: 'Means of Verification' },
    ],
    stakeholder: [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'role', label: 'Category' },
      { key: 'level', label: 'Geographic Level' },
      { key: 'priority_score', label: 'Priority Score' },
      { key: 'capacity_to_act', label: 'Capacity to Act' },
    ],
    message: [
      { key: 'title', label: 'Title' },
      { key: 'body', label: 'Message Body' },
      { key: 'value_proposition', label: 'Value Proposition' },
      { key: 'domain', label: 'Domain' },
      { key: 'status', label: 'Status' },
      { key: 'audience', label: 'Target Audience' },
      { key: 'expires_at', label: 'Expires' },
    ],
    asset: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'type', label: 'Type' },
      { key: 'maturity_level', label: 'Maturity Level' },
      { key: 'access_modality', label: 'Access Modality' },
      { key: 'exploitation_status', label: 'Exploitation Status' },
      { key: 'responsible_partner', label: 'Responsible Partner' },
      { key: 'notes', label: 'Notes' },
    ],
    activity: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'domain', label: 'Domain' },
      { key: 'status', label: 'Status' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'budget_estimate', label: 'Budget Estimate' },
      { key: 'effort_hours', label: 'Effort Hours' },
      { key: 'expected_outputs', label: 'Expected Outputs' },
    ],
    channel: [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'type', label: 'Type' },
      { key: 'cost_type', label: 'Cost Type' },
      { key: 'reach_estimate', label: 'Estimated Reach' },
      { key: 'notes', label: 'Notes' },
    ],
    campaign: [
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'budget', label: 'Budget' },
      { key: 'notes', label: 'Notes' },
    ],
    indicator: [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'measurement_unit', label: 'Unit' },
      { key: 'target_value', label: 'Target' },
    ],
  };

  return configs[entityType] || [
    { key: 'title', label: 'Title' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
  ];
}

export default function SharedView() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'loading' | 'expired' | 'revoked' | 'not_found' | 'ready'>('loading');
  const [entity, setEntity] = useState<any>(null);
  const [entityType, setEntityType] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setState('not_found');
      return;
    }

    loadSharedContent(token);
  }, [token]);

  async function loadSharedContent(shareToken: string) {
    setState('loading');

    const resolved = await resolveShareToken(shareToken);
    if (!resolved) {
      setState('not_found');
      return;
    }

    if (resolved.expired) {
      setState('expired');
      return;
    }

    if (resolved.revoked) {
      setState('revoked');
      return;
    }

    const data = await fetchSharedEntity(resolved.entityType, resolved.entityId, resolved.projectId);
    if (!data) {
      setState('not_found');
      return;
    }

    setEntityType(resolved.entityType);
    setEntity(data);
    setState('ready');
  }

  // Error states
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1BAE70] mx-auto mb-4" />
          <p className="text-gray-500">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <ErrorPage
        icon={<Clock className="w-12 h-12 text-amber-400" />}
        title="Link Expired"
        message="This share link has expired. Ask the sender for a new link."
      />
    );
  }

  if (state === 'revoked') {
    return (
      <ErrorPage
        icon={<ShieldX className="w-12 h-12 text-red-400" />}
        title="Link Revoked"
        message="This share link has been revoked and is no longer accessible."
      />
    );
  }

  if (state === 'not_found' || !entity) {
    return (
      <ErrorPage
        icon={<AlertCircle className="w-12 h-12 text-gray-400" />}
        title="Not Found"
        message="This shared content could not be found. The link may be invalid."
      />
    );
  }

  // Success — render the shared entity
  const Icon = ENTITY_ICONS[entityType] || Target;
  const fields = getFieldConfig(entityType);
  const entityTitle = entity.title || entity.name || 'Shared Item';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1BAE70]/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-[#1BAE70]" />
            </div>
            <div>
              <div className="text-xs font-medium text-[#1BAE70] uppercase tracking-wider">
                Shared {ENTITY_TYPE_LABELS[entityType] || entityType}
              </div>
              <div className="text-xs text-gray-400">Read-only view</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Powered by</span>
            <span className="font-semibold text-[#14261C]">CDE Manager</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Title Section */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{entityTitle}</h1>
                {entity.domain && (
                  <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {entity.domain}
                  </span>
                )}
              </div>
              <StatusBadge status={entity.status} />
            </div>
          </div>

          {/* Fields */}
          <div className="px-6 py-2">
            <dl>
              {fields.map(({ key, label }) => (
                <FieldRow key={key} label={label} value={entity[key]} />
              ))}
            </dl>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <span>
              Created {entity.created_at ? new Date(entity.created_at).toLocaleDateString() : 'N/A'}
              {entity.updated_at && ` · Updated ${new Date(entity.updated_at).toLocaleDateString()}`}
            </span>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-[#1BAE70] hover:text-[#06752E] font-medium"
            >
              Sign in for full access
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorPage({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-6">{message}</p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1BAE70] text-white rounded-lg hover:bg-[#06752E] font-medium transition-colors"
        >
          Sign in to CDE Manager
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
