import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProjectSwitcher from './ProjectSwitcher';
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
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
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
  { path: '/governance', label: 'Plans & Governance', icon: Building2 },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

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
