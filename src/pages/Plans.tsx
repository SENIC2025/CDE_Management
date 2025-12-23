import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { PlanCatalog } from '../lib/entitlements';
import { Check, X, ChevronDown, ChevronUp, Shield, Crown } from 'lucide-react';

export default function Plans() {
  const { profile } = useAuth();
  const { planTier, isOrgAdmin } = useEntitlements();
  const [catalog, setCatalog] = useState<PlanCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  async function loadCatalog() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('plan_catalog')
        .select('*')
        .order('plan_tier');

      if (data) {
        setCatalog(data as PlanCatalog[]);
      }
    } catch (error) {
      console.error('Error loading plan catalog:', error);
    } finally {
      setLoading(false);
    }
  }

  const tierOrder = { project: 1, portfolio: 2, organisation: 3 };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Choose Your Plan</h1>
        <p className="text-lg text-slate-600">
          Professional governance and entitlements for CDE management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {catalog
          .sort((a, b) => tierOrder[a.plan_tier as keyof typeof tierOrder] - tierOrder[b.plan_tier as keyof typeof tierOrder])
          .map((plan) => {
            const isCurrentPlan = plan.plan_tier === planTier;
            const entitlements = plan.default_entitlements_json;

            return (
              <div
                key={plan.plan_tier}
                className={`relative bg-white rounded-lg shadow-lg overflow-hidden transition ${
                  isCurrentPlan ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Crown size={14} />
                      Current Plan
                    </div>
                  </div>
                )}

                <div className="p-6 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={24} className="text-blue-600" />
                    <h2 className="text-2xl font-bold text-slate-900">{plan.name}</h2>
                  </div>
                  <p className="text-slate-600 text-sm">{plan.description}</p>
                </div>

                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm font-medium text-slate-700">Project Limit</span>
                      <span className="text-sm font-semibold text-slate-900">
                        {entitlements.max_projects === null ? 'Unlimited' : entitlements.max_projects}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Portfolio Dashboard</span>
                      {entitlements.portfolio_dashboard_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Cross-Project Reporting</span>
                      {entitlements.cross_project_reporting_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Shared Templates</span>
                      {entitlements.shared_templates_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Shared Indicator Library</span>
                      {entitlements.shared_indicator_library_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Org-Level Methodology</span>
                      {entitlements.org_level_methodology_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Org Defaults</span>
                      {entitlements.org_defaults_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Export Branding</span>
                      {entitlements.export_branding_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700">Compliance Profiles</span>
                      {entitlements.compliance_profiles_enabled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <X size={20} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {isOrgAdmin && (
                    <button
                      onClick={() => setExpandedPlan(expandedPlan === plan.plan_tier ? null : plan.plan_tier)}
                      className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 py-2 border-t"
                    >
                      <span>View Entitlements Detail</span>
                      {expandedPlan === plan.plan_tier ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}

                  {isOrgAdmin && expandedPlan === plan.plan_tier && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <pre className="text-xs text-slate-600 overflow-x-auto">
                        {JSON.stringify(entitlements, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t">
                  {isCurrentPlan ? (
                    <div className="text-center text-sm text-slate-600 font-medium">
                      Your current plan
                    </div>
                  ) : isOrgAdmin ? (
                    <Link
                      to="/governance"
                      className="block text-center bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium"
                    >
                      Change to {plan.name}
                    </Link>
                  ) : (
                    <div className="text-center text-sm text-slate-600">
                      Contact your org admin to change plans
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help Choosing?</h3>
        <p className="text-sm text-blue-800 mb-4">
          All plans include full compliance profiles and decision support. Upgrade for multi-project portfolio management,
          shared resources, and org-wide governance controls.
        </p>
        {isOrgAdmin && (
          <Link
            to="/governance"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm font-medium"
          >
            <Shield size={16} />
            Manage Plan & Governance
          </Link>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-900 mb-1">Can I change plans later?</h4>
            <p className="text-sm text-slate-600">
              Yes, organisation administrators can upgrade or downgrade plans at any time from the Plans & Governance page.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 mb-1">What happens to my data when I change plans?</h4>
            <p className="text-sm text-slate-600">
              All your data is preserved. Some features may become unavailable if you downgrade, but your data remains intact.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-slate-900 mb-1">What is org-level methodology governance?</h4>
            <p className="text-sm text-slate-600">
              Organisation tier allows you to define a standard methodology that all projects inherit, ensuring consistency
              across your portfolio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
