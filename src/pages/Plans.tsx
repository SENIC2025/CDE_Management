import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { PRICING, PLAN_DISPLAY_NAMES, type PlanTier } from '../lib/entitlements';
import { createCheckoutSession, getPriceId, isStripeConfigured } from '../lib/stripe';
import PageHeader from '../components/ui/PageHeader';
import {
  Check,
  X,
  Shield,
  Crown,
  Zap,
  Building2,
  ArrowRight,
  Sparkles,
  Users,
  BarChart3,
  Globe,
  ChevronDown,
  ChevronUp,
  Plus,
  Clock,
  HardDrive,
  CreditCard,
  Headphones,
  MessageCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ── Feature list per tier ────────────────────────────────────────
const PLAN_FEATURES: Record<string, { icon: any; color: string; features: string[]; highlight: string }> = {
  project: {
    icon: Zap,
    color: 'slate',
    features: [
      '1 active project',
      '5 team seats included',
      '5 GB storage',
      '30-day free trial',
      'Full CDE workflow (objectives, stakeholders, channels, activities)',
      'Evidence management & upload',
      'Compliance dashboard',
      'Decision-support flags',
      'Basic report generation',
      'Community support',
    ],
    highlight: 'Perfect for testing CDE Manager on a single EU project. Start with a 30-day free trial.',
  },
  portfolio: {
    icon: Building2,
    color: 'green',
    features: [
      '3 projects included',
      '10 team seats included',
      '25 GB storage',
      'Everything in Project, plus:',
      'Portfolio dashboard with cross-project insights',
      'Cross-project reporting & analytics',
      'Shared templates across projects',
      'Shared indicator library',
      'Custom export branding (logo, colours, headers)',
      'Organisation-wide defaults',
      'Priority email support',
    ],
    highlight: 'Most popular for organisations managing multiple EU projects.',
  },
  organisation: {
    icon: Crown,
    color: 'amber',
    features: [
      '10 projects included',
      '25 team seats included',
      '100 GB storage',
      'Everything in Portfolio, plus:',
      'Org-level methodology governance',
      'Custom compliance rules',
      'Enforce standards across all projects',
      'Full governance controls & audit trail',
      'Portfolio governance pack export',
      'Dedicated onboarding session',
      'Priority support with SLA',
    ],
    highlight: 'For large institutions and research consortia needing full governance.',
  },
  enterprise: {
    icon: Shield,
    color: 'indigo',
    features: [
      'Unlimited projects',
      'Unlimited team seats',
      '500+ GB storage',
      'Everything in Organisation, plus:',
      'API access for integrations',
      'Advanced compliance rule engine',
      'Dedicated account manager',
      'SLA-backed support',
      'Portfolio analytics customisation',
      'Optional on-premise hosting',
      'Custom onboarding & training',
    ],
    highlight: 'For large consortia (30–100+ projects) needing tailored solutions.',
  },
};

// ── Add-on display ──────────────────────────────────────────────
const ADDON_LABELS = [
  { key: 'project', label: 'Additional project', unit: '/project/mo' },
  { key: 'seat', label: 'Additional seat', unit: '/seat/mo' },
  { key: 'storage', label: 'Additional storage', unit: '/GB/mo' },
];

// ── Feature comparison table ────────────────────────────────────
const COMPARISON_FEATURES = [
  { category: 'Projects & Team', features: [
    { name: 'Included projects', project: '1', portfolio: '3', organisation: '10', enterprise: 'Unlimited' },
    { name: 'Additional projects', project: '€35/mo each', portfolio: '€30/mo each', organisation: '€25/mo each', enterprise: 'Included' },
    { name: 'Team seats included', project: '5', portfolio: '10', organisation: '25', enterprise: 'Unlimited' },
    { name: 'Additional seats', project: '€8/seat/mo', portfolio: '€6/seat/mo', organisation: '€5/seat/mo', enterprise: 'Included' },
    { name: 'Storage included', project: '5 GB', portfolio: '25 GB', organisation: '100 GB', enterprise: '500+ GB' },
    { name: 'Additional storage', project: '€5/GB/mo', portfolio: '€4/GB/mo', organisation: '€3/GB/mo', enterprise: 'Custom' },
  ]},
  { category: 'CDE Workflow', features: [
    { name: 'Objectives & KPIs', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Stakeholder management', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Message & value library', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Channel catalog', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Activity planner', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Evidence management', project: true, portfolio: true, organisation: true, enterprise: true },
  ]},
  { category: 'Analytics & Reporting', features: [
    { name: 'Compliance dashboard', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Decision-support flags', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Basic reports', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Cross-project reporting', project: false, portfolio: true, organisation: true, enterprise: true },
    { name: 'Portfolio dashboard', project: false, portfolio: true, organisation: true, enterprise: true },
    { name: 'Portfolio governance pack', project: false, portfolio: false, organisation: true, enterprise: true },
    { name: 'Custom analytics', project: false, portfolio: false, organisation: false, enterprise: true },
  ]},
  { category: 'Governance & Control', features: [
    { name: 'Shared templates', project: false, portfolio: true, organisation: true, enterprise: true },
    { name: 'Shared indicator library', project: false, portfolio: true, organisation: true, enterprise: true },
    { name: 'Custom export branding', project: false, portfolio: true, organisation: true, enterprise: true },
    { name: 'Organisation defaults', project: false, portfolio: true, organisation: true, enterprise: true },
    { name: 'Org-level methodology', project: false, portfolio: false, organisation: true, enterprise: true },
    { name: 'Custom compliance rules', project: false, portfolio: false, organisation: true, enterprise: true },
    { name: 'Governance enforcement', project: false, portfolio: false, organisation: true, enterprise: true },
    { name: 'Full audit trail', project: false, portfolio: false, organisation: true, enterprise: true },
    { name: 'API access', project: false, portfolio: false, organisation: false, enterprise: true },
  ]},
  { category: 'Support', features: [
    { name: 'Community support', project: true, portfolio: true, organisation: true, enterprise: true },
    { name: 'Email support', project: false, portfolio: true, organisation: true, enterprise: true },
    { name: 'Priority support with SLA', project: false, portfolio: false, organisation: true, enterprise: true },
    { name: 'Dedicated account manager', project: false, portfolio: false, organisation: false, enterprise: true },
    { name: 'Custom onboarding', project: false, portfolio: false, organisation: false, enterprise: true },
  ]},
];

export default function Plans() {
  const { profile } = useAuth();
  const { currentOrg } = useOrganisation();
  const { planTier, isOrgAdmin, billingInfo } = useEntitlements();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [showComparison, setShowComparison] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const orgId = currentOrg?.id || profile?.org_id;
  const stripeReady = isStripeConfigured();
  const hasActiveSubscription = !!billingInfo?.stripe_subscription_id;

  // Handle ?checkout=cancelled redirect
  useEffect(() => {
    if (searchParams.get('checkout') === 'cancelled') {
      setCheckoutError('Checkout was cancelled. You can try again anytime.');
      // Clear the param from URL
      window.history.replaceState({}, '', '/plans');
    }
  }, [searchParams]);

  async function handleSubscribe(tier: PlanTier) {
    if (!orgId) {
      setCheckoutError('No organisation found. Please select an organisation first.');
      return;
    }

    const priceId = getPriceId(tier, billingCycle);
    if (!priceId) {
      setCheckoutError('Stripe is not configured yet. Please contact your administrator.');
      return;
    }

    setCheckoutLoading(tier);
    setCheckoutError(null);

    try {
      const { url } = await createCheckoutSession(orgId, priceId);
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      console.error('[Plans] Checkout error:', error);
      setCheckoutError(error.message || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  }

  const tiers: PlanTier[] = ['project', 'portfolio', 'organisation', 'enterprise'];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-12">
      {/* Page Header */}
      <PageHeader
        icon={CreditCard}
        title="Plans & Pricing"
        subtitle="From a single EU-funded project to an entire research portfolio"
      />

      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-[#1BAE70]/10 text-[#06752E] text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          <Sparkles size={14} />
          Governance-grade CDE management
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-[#14261C] mb-3">
          Plans that grow with your projects
        </h1>
        <p className="text-lg text-[#4E5652] max-w-2xl mx-auto">
          Start with a 30-day free trial, then pay only for what you need.
          Scale up as your portfolio grows.
        </p>
      </div>

      {/* Checkout error/cancelled banner */}
      {checkoutError && (
        <div className="max-w-2xl mx-auto bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 flex-1">{checkoutError}</p>
          <button
            onClick={() => setCheckoutError(null)}
            className="text-amber-600 hover:text-amber-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stripe not configured notice (visible to admins) */}
      {!stripeReady && isOrgAdmin && (
        <div className="max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <CreditCard size={18} className="text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Payment processing is being set up. Subscription buttons will activate once Stripe is configured.
          </p>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-[#14261C]' : 'text-[#4E5652]'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            billingCycle === 'annual' ? 'bg-[#1BAE70]' : 'bg-slate-300'
          }`}
        >
          <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
            billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-0.5'
          }`} />
        </button>
        <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-[#14261C]' : 'text-[#4E5652]'}`}>
          Annual
        </span>
        {billingCycle === 'annual' && (
          <span className="bg-[#1BAE70]/10 text-[#06752E] text-xs font-semibold px-2.5 py-1 rounded-full">
            Save ~20%
          </span>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {tiers.map((tier) => {
          const pricing = PRICING[tier];
          const features = PLAN_FEATURES[tier];
          const isCurrentPlan = tier === planTier;
          const isPopular = tier === 'portfolio';
          const isEnterprise = tier === 'enterprise';
          const price = billingCycle === 'annual' ? pricing.annual : pricing.monthly;
          const TierIcon = features.icon;
          const hasFreeTrial = tier === 'project';

          return (
            <div
              key={tier}
              className={`relative bg-white rounded-xl overflow-hidden transition-all ${
                isPopular
                  ? 'shadow-xl ring-2 ring-[#1BAE70] scale-[1.02]'
                  : 'shadow-lg ring-1 ring-slate-200'
              }`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="bg-[#1BAE70] text-white text-center py-2 text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="p-6">
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tier === 'project' ? 'bg-slate-100' :
                    tier === 'portfolio' ? 'bg-[#1BAE70]/10' :
                    tier === 'organisation' ? 'bg-amber-100' :
                    'bg-indigo-100'
                  }`}>
                    <TierIcon size={20} className={
                      tier === 'project' ? 'text-slate-600' :
                      tier === 'portfolio' ? 'text-[#1BAE70]' :
                      tier === 'organisation' ? 'text-amber-600' :
                      'text-indigo-600'
                    } />
                  </div>
                  <h2 className="text-xl font-bold text-[#14261C]">
                    {PLAN_DISPLAY_NAMES[tier]}
                  </h2>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {isEnterprise ? (
                    <div>
                      <span className="text-3xl font-bold text-[#14261C]">Custom</span>
                      <p className="text-xs text-[#4E5652] mt-1">Tailored to your needs</p>
                    </div>
                  ) : hasFreeTrial ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-[#1BAE70]" />
                        <span className="text-xs font-semibold text-[#06752E]">30-day free trial</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[#14261C]">€{price}</span>
                        <span className="text-[#4E5652] text-sm">/mo after</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <div className="text-xs text-[#4E5652] mt-1">
                          €{price! * 12}/year · Billed annually
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[#14261C]">€{price}</span>
                        <span className="text-[#4E5652] text-sm">/mo</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <div className="text-xs text-[#4E5652] mt-1">
                          €{price! * 12}/year · Billed annually
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Included resources */}
                {!isEnterprise && (
                  <div className="mb-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-[#4E5652]">
                      <HardDrive size={12} className="text-[#1BAE70]" />
                      <span><strong className="text-[#14261C]">{pricing.includedProjects}</strong> project{pricing.includedProjects! > 1 ? 's' : ''} · <strong className="text-[#14261C]">{pricing.includedSeats}</strong> seats · <strong className="text-[#14261C]">{pricing.includedStorageGb} GB</strong></span>
                    </div>
                  </div>
                )}

                {/* Highlight */}
                <p className="text-sm text-[#4E5652] mb-5">{features.highlight}</p>

                {/* CTA */}
                {isCurrentPlan ? (
                  hasActiveSubscription ? (
                    <Link
                      to="/governance"
                      className="w-full py-3 rounded-lg text-center text-sm font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-200 transition"
                    >
                      <Crown size={16} />
                      Manage Subscription
                    </Link>
                  ) : (
                    <div className="w-full py-3 rounded-lg text-center text-sm font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center gap-2">
                      <Crown size={16} />
                      Your Current Plan
                    </div>
                  )
                ) : isEnterprise ? (
                  <a
                    href="mailto:hello@senic.space?subject=CDE Manager Enterprise Enquiry"
                    className="w-full py-3 rounded-lg text-center text-sm font-semibold flex items-center justify-center gap-2 transition bg-[#14261C] text-white hover:bg-[#14261C]/90"
                  >
                    Contact Us
                    <MessageCircle size={16} />
                  </a>
                ) : isOrgAdmin ? (
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={!!checkoutLoading || !stripeReady}
                    className={`w-full py-3 rounded-lg text-center text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      isPopular
                        ? 'bg-[#1BAE70] text-white hover:bg-[#06752E]'
                        : hasFreeTrial
                        ? 'bg-[#1BAE70] text-white hover:bg-[#06752E]'
                        : 'bg-[#14261C] text-white hover:bg-[#14261C]/90'
                    }`}
                  >
                    {checkoutLoading === tier ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Redirecting to checkout...
                      </>
                    ) : !stripeReady ? (
                      <>
                        {hasFreeTrial ? 'Start Free Trial' : `Upgrade to ${PLAN_DISPLAY_NAMES[tier]}`}
                        <ArrowRight size={16} />
                      </>
                    ) : (
                      <>
                        {hasFreeTrial ? 'Start Free Trial' : `Upgrade to ${PLAN_DISPLAY_NAMES[tier]}`}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-lg text-center text-sm text-slate-500 border border-slate-200">
                    Contact your admin to upgrade
                  </div>
                )}

                {/* Feature list */}
                <div className="mt-6 space-y-2.5">
                  {features.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {feature.startsWith('Everything in') ? (
                        <>
                          <div className="w-4 h-4 mt-0.5" />
                          <span className="text-xs font-semibold text-[#1BAE70]">{feature}</span>
                        </>
                      ) : feature.includes('free trial') ? (
                        <>
                          <Clock size={14} className="text-[#1BAE70] mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-[#06752E] font-medium">{feature}</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} className="text-[#1BAE70] mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-[#4E5652]">{feature}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add-ons */}
                {!isEnterprise && (
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-[#4E5652] uppercase tracking-wider mb-2">Add-ons</p>
                    <div className="space-y-1">
                      {ADDON_LABELS.map((addon) => {
                        const addonPricing = pricing.addons[addon.key as keyof typeof pricing.addons];
                        return (
                          <div key={addon.key} className="flex items-center justify-between text-[11px]">
                            <span className="text-[#4E5652]">{addon.label}</span>
                            <span className="font-medium text-[#14261C]">€{addonPricing}{addon.unit}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Professional Services */}
      <div className="bg-gradient-to-r from-[#14261C] to-[#06752E] rounded-xl p-8 text-white max-w-4xl mx-auto">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Headphones size={20} />
          Professional Services
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 rounded-lg p-5 backdrop-blur">
            <h4 className="font-semibold mb-1">Portfolio Compliance Audit</h4>
            <p className="text-sm text-white/80 mb-2">
              Expert review of your CDE compliance across all projects with actionable recommendations.
            </p>
            <p className="text-sm font-medium">€3,000 – €7,000 / year</p>
          </div>
          <div className="bg-white/10 rounded-lg p-5 backdrop-blur">
            <h4 className="font-semibold mb-1">Training Packages</h4>
            <p className="text-sm text-white/80 mb-2">
              Tailored workshops for your team: CDE best practices, compliance training, and tool onboarding.
            </p>
            <p className="text-sm font-medium">€2,500 – €10,000</p>
          </div>
        </div>
      </div>

      {/* Full Comparison Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="inline-flex items-center gap-2 text-[#1BAE70] hover:text-[#06752E] font-medium text-sm transition"
        >
          {showComparison ? 'Hide' : 'Show'} full feature comparison
          {showComparison ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Full Feature Comparison Table */}
      {showComparison && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#14261C] w-1/5">Feature</th>
                  {tiers.map((t) => (
                    <th key={t} className={`text-center py-4 px-3 text-sm font-semibold ${
                      t === 'portfolio' ? 'text-[#06752E] bg-[#1BAE70]/5' : 'text-[#14261C]'
                    }`}>
                      <div className="flex flex-col items-center gap-1">
                        {(() => {
                          const F = PLAN_FEATURES[t];
                          const I = F.icon;
                          return <I size={16} className={
                            t === 'portfolio' ? 'text-[#1BAE70]' :
                            t === 'organisation' ? 'text-amber-500' :
                            t === 'enterprise' ? 'text-indigo-500' :
                            'text-slate-500'
                          } />;
                        })()}
                        <span>{PLAN_DISPLAY_NAMES[t]}</span>
                        <span className="text-[10px] font-normal text-[#4E5652]">
                          {PRICING[t].monthly ? `€${PRICING[t].monthly}/mo` : 'Custom'}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((section) => (
                  <>
                    <tr key={section.category} className="bg-slate-50/50">
                      <td colSpan={5} className="py-3 px-6 text-xs font-bold text-[#4E5652] uppercase tracking-wider">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feature) => (
                      <tr key={feature.name} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 px-6 text-sm text-[#4E5652]">{feature.name}</td>
                        {tiers.map((t) => {
                          const value = (feature as any)[t];
                          return (
                            <td
                              key={t}
                              className={`py-3 px-3 text-center ${t === 'portfolio' ? 'bg-[#1BAE70]/5' : ''}`}
                            >
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <Check size={16} className="text-[#1BAE70] mx-auto" />
                                ) : (
                                  <X size={16} className="text-slate-300 mx-auto" />
                                )
                              ) : (
                                <span className={`text-xs font-medium ${
                                  value === '—' ? 'text-slate-400' : 'text-[#14261C]'
                                }`}>{value}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Value Propositions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Shield,
            title: 'Audit-Ready Compliance',
            desc: 'Every activity, every piece of evidence, every decision — tracked and traceable. Built for EU project reviews from day one.',
          },
          {
            icon: BarChart3,
            title: 'Decision Intelligence',
            desc: 'Channel effectiveness analysis, stakeholder responsiveness scoring, and risk flags that surface problems before they become findings.',
          },
          {
            icon: Globe,
            title: 'Built for EU Projects',
            desc: 'Designed around real Horizon Europe, Erasmus+, and Structural Fund workflows. Purpose-built for CDE.',
          },
        ].map((item) => (
          <div key={item.title} className="text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-[#1BAE70]/10 flex items-center justify-center mx-auto mb-4">
              <item.icon size={24} className="text-[#1BAE70]" />
            </div>
            <h3 className="font-semibold text-[#14261C] mb-2">{item.title}</h3>
            <p className="text-sm text-[#4E5652]">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-[#14261C] text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-1">
          {[
            {
              q: 'Can I try CDE Manager for free?',
              a: 'Yes! The Project plan comes with a 30-day free trial. You\'ll need to enter your card details, but you won\'t be charged until the trial ends. Cancel anytime during the trial at no cost.',
            },
            {
              q: 'How do add-ons work?',
              a: 'Each plan includes a set number of projects, seats, and storage. If you need more, add them à la carte. For example, on the Portfolio plan (3 projects, 10 seats, 25 GB), adding 2 extra projects and 5 extra seats would be €30×2 + €6×5 = €90/mo extra.',
            },
            {
              q: 'Can I change plans later?',
              a: 'Yes — organisation administrators can upgrade or downgrade anytime from the billing portal. When upgrading, you keep all your data. When downgrading, projects beyond your new limit become read-only (never deleted).',
            },
            {
              q: 'What happens to my data if I downgrade?',
              a: 'All your data is preserved. You\'ll be asked to select which projects remain active. The rest become read-only — you can still view and export them, but editing is locked until you upgrade or reduce your project count.',
            },
            {
              q: 'Why annual billing?',
              a: 'Annual billing saves you ~20% and aligns with how EU projects budget — fixed annual costs are easier to report in cost statements. You can switch between monthly and annual at any renewal point.',
            },
            {
              q: 'Can I include the cost in my EU project budget?',
              a: 'Yes. CDE Manager costs typically fall under "management and coordination" or "digital tools and services" in Horizon Europe, Erasmus+, and similar programme budgets. We provide invoices suitable for cost reporting.',
            },
            {
              q: 'Do you offer institutional or consortium pricing?',
              a: 'Yes — our Enterprise plan is tailored for large institutions, research consortia, and multi-department setups. Contact us at hello@senic.space to discuss your needs.',
            },
            {
              q: 'What about professional services?',
              a: 'We offer Portfolio Compliance Audits (€3,000–€7,000/year) and Training Packages (€2,500–€10,000). These are optional services on top of any plan. Contact us for details.',
            },
          ].map((faq, idx) => (
            <div key={idx} className="border-b border-slate-100 last:border-b-0">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between py-4 text-left"
              >
                <span className="font-medium text-[#14261C] pr-4">{faq.q}</span>
                {expandedFaq === idx ? (
                  <ChevronUp size={18} className="text-[#4E5652] flex-shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-[#4E5652] flex-shrink-0" />
                )}
              </button>
              {expandedFaq === idx && (
                <p className="text-sm text-[#4E5652] pb-4 pr-8">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center bg-gradient-to-r from-[#14261C] to-[#06752E] rounded-xl p-10 text-white">
        <h2 className="text-2xl font-bold mb-3">Ready to streamline your CDE governance?</h2>
        <p className="text-white/80 mb-6 max-w-lg mx-auto">
          Join project teams across Europe who trust CDE Manager for audit-ready compliance and smarter dissemination.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isOrgAdmin && stripeReady ? (
            <button
              onClick={() => handleSubscribe('project')}
              disabled={!!checkoutLoading}
              className="bg-white text-[#14261C] hover:bg-white/90 px-6 py-3 rounded-lg font-semibold text-sm transition inline-flex items-center gap-2 disabled:opacity-60"
            >
              {checkoutLoading === 'project' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <Link
              to="/governance"
              className="bg-white text-[#14261C] hover:bg-white/90 px-6 py-3 rounded-lg font-semibold text-sm transition inline-flex items-center gap-2"
            >
              Start Free Trial
              <ArrowRight size={16} />
            </Link>
          )}
          <a
            href="mailto:hello@senic.space?subject=CDE Manager Enterprise Enquiry"
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-semibold text-sm transition border border-white/20"
          >
            Talk to Sales
          </a>
        </div>
      </div>
    </div>
  );
}
