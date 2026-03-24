import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useProject } from '../contexts/ProjectContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
import { useSessionMemory } from '../hooks/useSessionMemory';
import useProjectReadOnly from '../hooks/useProjectReadOnly';
import { ReadOnlyBanner } from './ui';
import ProjectSwitcher from './ProjectSwitcher';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Target,
  Users,
  MessageSquare,
  Package,
  Calendar,
  Radio,
  FileCheck,
  TrendingUp,
  Shield,
  FileText,
  BookOpen,
  Settings,
  Building2,
  Rocket,
  CreditCard,
  Lock,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  User,
  Library,
  Map,
  Compass,
  Hammer,
  BarChart3,
  FolderCog,
} from 'lucide-react';
import CdeLogo from './CdeLogo';

// ── Types ──────────────────────────────────────────────
interface NavItem {
  path: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  platformOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
}

interface LayoutProps {
  children: ReactNode;
}

// ── Collapsible Nav Group ──────────────────────────────
// ── Icon Box Component ─────────────────────────────────
function IconBox({ icon: Icon, isActive, size = 16 }: { icon: any; isActive: boolean; size?: number }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0 transition ${
        isActive
          ? 'bg-white/20'
          : 'bg-[#1BAE70]/15'
      }`}
    >
      <Icon size={size} className="text-white" />
    </span>
  );
}

function NavGroupSection({
  group,
  isExpanded,
  onToggle,
  currentPath,
  onNavClick,
}: {
  group: NavGroup;
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
  onNavClick: () => void;
}) {
  const hasActive = group.items.some((item) => currentPath === item.path);

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
          hasActive && !isExpanded
            ? 'text-[#1BAE70] bg-[#1BAE70]/10'
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2">
          <group.icon size={14} />
          <span>{group.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100 mt-0.5' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-0.5 pl-1">
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition text-sm group ${
                  isActive
                    ? 'bg-[#1BAE70] text-white font-medium'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
                onClick={onNavClick}
              >
                <IconBox icon={Icon} isActive={isActive} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────
export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { provisioning } = useOrganisation();
  const { showFirstProjectToast, dismissFirstProjectToast } = useProject();
  const { isOrgAdmin } = useEntitlements();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { isReadOnly, reason: readOnlyReason } = useProjectReadOnly();
  useSessionMemory();

  // ── Nav group expansion state ────────────────────
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // ── Navigation structure ─────────────────────────
  // Dashboard (always visible, top-level)
  const dashboardItem: NavItem = { path: '/', label: 'Dashboard', icon: LayoutDashboard };

  // 4 lifecycle groups
  const navGroups: NavGroup[] = [
    {
      id: 'plan',
      label: 'Plan',
      icon: Compass,
      items: [
        { path: '/strategy', label: 'CDE Strategy', icon: Map },
        { path: '/objectives', label: 'Objectives', icon: Target },
        { path: '/objective-library', label: 'Objective Library', icon: Library },
        { path: '/stakeholders', label: 'Stakeholders', icon: Users },
        { path: '/messages', label: 'Messages & Value', icon: MessageSquare },
        { path: '/channels', label: 'Channels', icon: Radio },
      ],
    },
    {
      id: 'execute',
      label: 'Execute',
      icon: Hammer,
      items: [
        { path: '/activities', label: 'Activities', icon: Calendar },
        { path: '/assets', label: 'Results & Assets', icon: Package },
      ],
    },
    {
      id: 'monitor',
      label: 'Monitor',
      icon: BarChart3,
      items: [
        { path: '/monitoring', label: 'M&E & Evidence', icon: FileCheck },
        { path: '/uptake', label: 'Exploitation', icon: TrendingUp },
        { path: '/compliance', label: 'Compliance', icon: Shield },
        { path: '/indicators', label: 'Indicator Library', icon: Library },
      ],
    },
    {
      id: 'report',
      label: 'Report',
      icon: FileText,
      items: [
        { path: '/reports', label: 'Reports', icon: FileText },
        { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
      ],
    },
  ];

  // Organisation section (bottom)
  const orgItems: NavItem[] = [
    { path: '/admin', label: 'Project Admin', icon: Settings },
    { path: '/settings/organisation', label: 'Organisation', icon: Building2 },
    { path: '/governance', label: 'Plans & Governance', icon: CreditCard },
    { path: '/plans', label: 'Plans Comparison', icon: BarChart3 },
    { path: '/admin/security', label: 'Security & Audit', icon: Lock, adminOnly: true },
    { path: '/platform-admin', label: 'Platform Admin', icon: ShieldCheck, platformOnly: true },
  ];

  // Filter org items by role
  const visibleOrgItems = orgItems.filter((item) => {
    if (item.adminOnly && !isOrgAdmin) return false;
    if (item.platformOnly && !isPlatformAdmin) return false;
    return true;
  });

  // ── Auto-expand group containing active route ────
  useEffect(() => {
    const currentPath = location.pathname;
    for (const group of navGroups) {
      if (group.items.some((item) => currentPath === item.path)) {
        setExpandedGroups((prev) => {
          const next = new Set(prev);
          next.add(group.id);
          return next;
        });
        break;
      }
    }
  }, [location.pathname]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  // ── Org section expand/collapse ──────────────────
  const [orgExpanded, setOrgExpanded] = useState(false);

  useEffect(() => {
    const isOrgRoute = visibleOrgItems.some((item) => location.pathname === item.path);
    if (isOrgRoute) setOrgExpanded(true);
  }, [location.pathname]);

  // ── All nav items for breadcrumb lookup ──────────
  const allNavItems = [
    dashboardItem,
    ...navGroups.flatMap((g) => g.items),
    ...orgItems,
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/plans', label: 'Plans', icon: CreditCard },
    { path: '/onboarding', label: 'Setup Wizard', icon: Rocket },
  ];

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F6F4' }}>
      {/* Provisioning overlay */}
      {provisioning && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1BAE70] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Setting up your workspace...</h3>
            <p className="text-slate-600">
              We're creating your organisation and first project. This will only take a moment.
            </p>
          </div>
        </div>
      )}

      {/* First project toast */}
      {showFirstProjectToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <Rocket size={24} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">Welcome to CDE Manager!</h4>
              <p className="text-sm text-green-800">
                We created "Your first project" to get you started. You can rename and customize it anytime.
              </p>
            </div>
            <button onClick={dismissFirstProjectToast} className="flex-shrink-0 text-green-600 hover:text-green-800">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/60 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 text-white z-50 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 flex flex-col`}
        style={{ backgroundColor: '#14261C' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#1BAE70] flex items-center justify-center">
              <CdeLogo size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold">CDE Manager</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={24} />
          </button>
        </div>

        {/* Project Switcher */}
        <ProjectSwitcher />

        {/* ── Main Navigation ───────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* Dashboard — always top */}
          <Link
            to={dashboardItem.path}
            className={`flex items-center gap-2.5 px-2 py-2 rounded-md transition group ${
              location.pathname === dashboardItem.path
                ? 'bg-[#1BAE70] text-white font-medium'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <IconBox icon={LayoutDashboard} isActive={location.pathname === dashboardItem.path} size={18} />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>

          {/* Divider */}
          <div className="pt-2" />

          {/* Lifecycle Groups */}
          {navGroups.map((group) => (
            <NavGroupSection
              key={group.id}
              group={group}
              isExpanded={expandedGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              currentPath={location.pathname}
              onNavClick={() => setSidebarOpen(false)}
            />
          ))}

          {/* Divider before org section */}
          <div className="pt-1">
            <div className="border-t border-white/10 pt-2" />
          </div>

          {/* Organisation Section */}
          <div>
            <button
              onClick={() => setOrgExpanded(!orgExpanded)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                visibleOrgItems.some((i) => location.pathname === i.path) && !orgExpanded
                  ? 'text-[#1BAE70] bg-[#1BAE70]/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderCog size={14} />
                <span>Organisation</span>
              </div>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${orgExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 ease-in-out ${
                orgExpanded ? 'max-h-96 opacity-100 mt-0.5' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-0.5 pl-1">
                {visibleOrgItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition text-sm group ${
                        isActive
                          ? 'bg-[#1BAE70] text-white font-medium'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <IconBox icon={Icon} isActive={isActive} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* ── User Footer ───────────────────────────── */}
        <div className="p-3 border-t border-white/10">
          <Link
            to="/profile"
            className={`flex items-center gap-2.5 px-2 py-2 rounded-md transition text-sm mb-2 group ${
              location.pathname === '/profile'
                ? 'bg-[#1BAE70] text-white font-medium'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <IconBox icon={User} isActive={location.pathname === '/profile'} />
            <span>Profile</span>
          </Link>
          <div className="flex items-center justify-between px-2 text-sm">
            <div className="min-w-0">
              <div className="font-medium text-slate-200 truncate">{profile?.full_name || 'User'}</div>
              <div className="text-slate-500 text-xs truncate">{profile?.email || ''}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-white/5 rounded-md transition text-slate-400 hover:text-white flex-shrink-0"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────── */}
      <div className="lg:pl-64">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-md"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Link to="/" className="hover:text-slate-900">
                Home
              </Link>
              {location.pathname !== '/' && (
                <>
                  <ChevronRight size={16} />
                  <span className="text-slate-900 font-medium">
                    {allNavItems.find((item) => item.path === location.pathname)?.label || 'Page'}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-6">
          {isReadOnly && readOnlyReason && <ReadOnlyBanner reason={readOnlyReason} />}
          {children}
        </main>
      </div>
    </div>
  );
}
