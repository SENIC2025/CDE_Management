import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganisation } from '../contexts/OrganisationContext';
import { useProject } from '../contexts/ProjectContext';
import { useEntitlements } from '../contexts/EntitlementsContext';
import { usePlatformAdmin } from '../hooks/usePlatformAdmin';
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
  ShieldCheck,
  User,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { provisioning } = useOrganisation();
  const { showFirstProjectToast, dismissFirstProjectToast } = useProject();
  const { isOrgAdmin } = useEntitlements();
  const { isPlatformAdmin } = usePlatformAdmin();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (profile?.org_id) {
      checkOnboarding();
    }
  }, [profile?.org_id]);

  async function checkOnboarding() {
    if (!profile?.org_id) return;

    try {
      const { data } = await supabase
        .from('onboarding_status')
        .select('completed_at')
        .eq('org_id', profile.org_id)
        .maybeSingle();

      setShowOnboarding(!data?.completed_at);
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin', label: 'Admin', icon: Settings },
    { path: '/objectives', label: 'CDE Strategy', icon: Target },
    { path: '/stakeholders', label: 'Stakeholders', icon: Users },
    { path: '/messages', label: 'Messages & Value', icon: MessageSquare },
    { path: '/assets', label: 'Results & Assets', icon: Package },
    { path: '/activities', label: 'Activities', icon: Calendar },
    { path: '/channels', label: 'Channels', icon: Radio },
    { path: '/monitoring', label: 'M&E & Evidence', icon: FileCheck },
    { path: '/uptake', label: 'Exploitation', icon: TrendingUp },
    { path: '/compliance', label: 'Compliance', icon: Shield },
    { path: '/reports', label: 'Reports', icon: FileText },
    { path: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
    { path: '/settings/organisation', label: 'Organisation', icon: Building2 },
    { path: '/governance', label: 'Plans & Governance', icon: Building2 },
    ...(showOnboarding ? [{ path: '/onboarding', label: 'Setup Wizard', icon: Rocket }] : []),
    { path: '/plans', label: 'Plan Comparison', icon: CreditCard },
    { path: '/profile', label: 'Profile', icon: User },
    ...(isOrgAdmin ? [{ path: '/admin/security', label: 'Security & Audit', icon: Lock }] : []),
    ...(isPlatformAdmin ? [{ path: '/platform-admin', label: 'Platform Admin', icon: ShieldCheck }] : []),
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
    <div className="min-h-screen bg-slate-50">
      {provisioning && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Setting up your workspace...</h3>
            <p className="text-slate-600">We're creating your organisation and first project. This will only take a moment.</p>
          </div>
        </div>
      )}

      {showFirstProjectToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Rocket size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">Welcome to CDE Manager!</h4>
              <p className="text-sm text-green-800">We created "Your first project" to get you started. You can rename and customize it anytime.</p>
            </div>
            <button
              onClick={dismissFirstProjectToast}
              className="flex-shrink-0 text-green-600 hover:text-green-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 bg-slate-900/50 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white z-50 transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold">CDE Manager</h1>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={24} />
          </button>
        </div>

        <ProjectSwitcher />

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">{profile?.name || 'User'}</div>
              <div className="text-slate-400 text-xs">{profile?.email || ''}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-slate-800 rounded-md transition"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

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
              <Link to="/" className="hover:text-slate-900">Home</Link>
              {location.pathname !== '/' && (
                <>
                  <ChevronRight size={16} />
                  <span className="text-slate-900 font-medium">
                    {navItems.find(item => item.path === location.pathname)?.label || 'Page'}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
