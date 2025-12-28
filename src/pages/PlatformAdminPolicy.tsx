import { Shield, FileText, Lock, Eye, Database, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const APP_VERSION = '1.0.0';
const LAST_UPDATED = '2025-12-28';

export default function PlatformAdminPolicy() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Platform Admin Operating Policy</h1>
          <p className="text-slate-600 mt-1">Last updated: {LAST_UPDATED} | Version: {APP_VERSION}</p>
        </div>
        <Link
          to="/platform-admin"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Console
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={20} className="text-blue-600" />
          <h3 className="font-semibold text-blue-900">Important Notice</h3>
        </div>
        <p className="text-blue-800 text-sm">
          Platform Admin access is a privileged role intended for operational monitoring,
          incident response, and support activities only. All actions are logged and subject to audit.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow divide-y divide-slate-200">
        <Section
          icon={<FileText className="text-blue-600" />}
          title="1. Purpose of Platform Admin"
          content={
            <div className="space-y-3">
              <p>
                The Platform Admin role exists to enable operational excellence and customer support:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                <li>Monitor system health and usage patterns across organisations</li>
                <li>Respond to customer support requests requiring cross-org visibility</li>
                <li>Investigate incidents and generate diagnostic reports</li>
                <li>Validate compliance and security posture at the platform level</li>
                <li>Generate anonymized analytics for product improvement</li>
              </ul>
            </div>
          }
        />

        <Section
          icon={<Lock className="text-green-600" />}
          title="2. Read-Only Principle"
          content={
            <div className="space-y-3">
              <p className="font-medium text-slate-900">
                Platform Admin access is strictly read-only by design.
              </p>
              <p>
                Platform administrators can view aggregated data across organisations but cannot:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 ml-4">
                <li>Modify organisation settings or configurations</li>
                <li>Create, update, or delete projects</li>
                <li>Access or modify project content (objectives, activities, evidence)</li>
                <li>Change user permissions or memberships</li>
                <li>Execute any write operations on tenant data</li>
              </ul>
              <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                <p className="text-green-800 text-sm">
                  <strong>Enforcement:</strong> Read-only access is enforced at both the UI and database level
                  through row-level security policies and function permissions.
                </p>
              </div>
            </div>
          }
        />

        <Section
          icon={<Eye className="text-orange-600" />}
          title="3. Audit Logging Scope"
          content={
            <div className="space-y-3">
              <p>
                Every platform admin action is automatically logged to the audit trail:
              </p>
              <div className="bg-slate-50 rounded p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-slate-900">Logged Actions:</strong>
                    <ul className="list-disc list-inside mt-1 text-slate-700 ml-2">
                      <li>View organisation summary</li>
                      <li>View project summary</li>
                      <li>View audit events</li>
                      <li>Export data (any format)</li>
                      <li>Generate support bundles</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-slate-900">Logged Metadata:</strong>
                    <ul className="list-disc list-inside mt-1 text-slate-700 ml-2">
                      <li>Timestamp</li>
                      <li>User identity</li>
                      <li>Filters applied</li>
                      <li>Record counts</li>
                      <li>Date ranges</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Audit logs are immutable and retained according to the platform retention policy.
              </p>
            </div>
          }
        />

        <Section
          icon={<Database className="text-purple-600" />}
          title="4. Data Access & Privacy"
          content={
            <div className="space-y-3">
              <p>
                Platform admins have access to aggregated metadata and operational metrics:
              </p>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">Accessible Data:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4 text-sm">
                    <li>Organisation names, creation dates, and plan tiers</li>
                    <li>Project titles, statuses, and member counts</li>
                    <li>Compliance status summaries (counts, not detailed assessments)</li>
                    <li>Decision support flag counts by severity</li>
                    <li>Export activity statistics</li>
                    <li>Audit event metadata (type, action, timestamp)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">Excluded Data:</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 ml-4 text-sm">
                    <li>Evidence files and binary content</li>
                    <li>Detailed project narratives and free-text fields</li>
                    <li>Personal identifiable information beyond email addresses</li>
                    <li>Detailed change diffs and field-level modifications</li>
                    <li>Message content and stakeholder communications</li>
                  </ul>
                </div>
              </div>
            </div>
          }
        />

        <Section
          icon={<AlertTriangle className="text-red-600" />}
          title="5. Acceptable Use Policy"
          content={
            <div className="space-y-3">
              <p className="font-medium text-slate-900">
                Platform Admin access must be used responsibly and ethically:
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-4 space-y-2">
                <div>
                  <strong className="text-red-900">Permitted Uses:</strong>
                  <ul className="list-disc list-inside mt-1 text-red-800 text-sm ml-2">
                    <li>Responding to verified customer support requests</li>
                    <li>Investigating reported incidents or system issues</li>
                    <li>Generating aggregated usage reports for product planning</li>
                    <li>Validating security and compliance posture</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-900">Prohibited Uses:</strong>
                  <ul className="list-disc list-inside mt-1 text-red-800 text-sm ml-2">
                    <li>Browsing tenant data without a legitimate business need</li>
                    <li>Sharing customer data outside of approved channels</li>
                    <li>Using access for competitive intelligence or sales purposes</li>
                    <li>Circumventing security controls or audit logging</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Violations of this policy may result in immediate revocation of platform admin
                privileges and disciplinary action.
              </p>
            </div>
          }
        />

        <Section
          icon={<FileText className="text-slate-600" />}
          title="6. Support Workflow"
          content={
            <div className="space-y-3">
              <p>
                When generating support bundles for incident response:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-slate-700 ml-4">
                <li>
                  <strong>Verify the request:</strong> Ensure there is a valid support ticket
                  or incident report requiring diagnostic data
                </li>
                <li>
                  <strong>Select appropriate scope:</strong> Export only the organisation and
                  date range relevant to the issue
                </li>
                <li>
                  <strong>Review the bundle:</strong> Confirm exported data is minimal and
                  necessary for troubleshooting
                </li>
                <li>
                  <strong>Secure transmission:</strong> Share bundles only through approved
                  secure channels
                </li>
                <li>
                  <strong>Document usage:</strong> Note the ticket ID and purpose in your
                  incident tracking system
                </li>
                <li>
                  <strong>Delete when complete:</strong> Remove local copies once the incident
                  is resolved
                </li>
              </ol>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 mt-3">
                <p className="text-slate-700 text-sm">
                  <strong>Reminder:</strong> All support bundle exports are automatically logged
                  with the requesting user, organisation, and date range.
                </p>
              </div>
            </div>
          }
        />
      </div>

      <div className="bg-slate-100 rounded-lg p-6 text-center">
        <p className="text-slate-700">
          Questions about this policy? Contact the Security Team at{' '}
          <a href="mailto:security@example.com" className="text-blue-600 hover:text-blue-700 font-medium">
            security@example.com
          </a>
        </p>
      </div>
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

function Section({ icon, title, content }: SectionProps) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="text-slate-700">{content}</div>
    </div>
  );
}
