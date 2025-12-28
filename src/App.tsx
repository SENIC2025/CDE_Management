import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrganisationProvider } from './contexts/OrganisationContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { EntitlementsProvider } from './contexts/EntitlementsContext';
import Layout from './components/Layout';
import RequireOrg from './components/RequireOrg';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Objectives from './pages/Objectives';
import Stakeholders from './pages/Stakeholders';
import Messages from './pages/Messages';
import Assets from './pages/Assets';
import Activities from './pages/Activities';
import Channels from './pages/Channels';
import Monitoring from './pages/Monitoring';
import Uptake from './pages/Uptake';
import Compliance from './pages/Compliance';
import Reports from './pages/Reports';
import Knowledge from './pages/Knowledge';
import ProjectSettings from './pages/ProjectSettings';
import Governance from './pages/Governance';
import Onboarding from './pages/Onboarding';
import Plans from './pages/Plans';
import AdminSecurity from './pages/AdminSecurity';
import OrganisationSettings from './pages/OrganisationSettings';
import PlatformAdmin from './pages/PlatformAdmin';
import PlatformAdminPolicy from './pages/PlatformAdminPolicy';
import Profile from './pages/Profile';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Dashboard />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Admin />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/objectives"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Objectives />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stakeholders"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Stakeholders />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Messages />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Assets />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/activities"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Activities />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/channels"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Channels />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitoring"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Monitoring />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/uptake"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Uptake />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Compliance />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Reports />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Knowledge />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <ProjectSettings />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/governance"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Governance />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <Onboarding />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <ProtectedRoute>
            <Layout>
              <Plans />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/security"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <AdminSecurity />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/organisation"
        element={
          <ProtectedRoute>
            <RequireOrg>
              <Layout>
                <OrganisationSettings />
              </Layout>
            </RequireOrg>
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform-admin"
        element={
          <ProtectedRoute>
            <Layout>
              <PlatformAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform-admin/policy"
        element={
          <ProtectedRoute>
            <Layout>
              <PlatformAdminPolicy />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrganisationProvider>
          <EntitlementsProvider>
            <ProjectProvider>
              <AppRoutes />
            </ProjectProvider>
          </EntitlementsProvider>
        </OrganisationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
