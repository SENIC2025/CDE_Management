import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  auth_id: string;
  org_id: string;
  full_name: string;
  email: string;
  role?: string;
  avatar_url?: string;
  job_title?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, orgName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    // Only load profile once per session to prevent double-loading
    // from both getSession and onAuthStateChange
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setProfileLoaded(false);
        setLoading(false);
      }
      // Don't call loadProfile here - getSession already handles the initial load
      // and signIn/signUp will trigger their own state changes
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(authId: string) {
    try {
      console.log('[AuthContext] Loading profile for auth_id:', authId);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error querying users table:', error);
        throw error;
      }

      if (data) {
        console.log('[AuthContext] Profile loaded:', data.full_name, 'org_id:', data.org_id || 'none');
      } else {
        console.log('[AuthContext] No profile found in users table for this auth_id');
      }

      // SIMPLE: Just set the profile as-is. Don't try to auto-bootstrap.
      // OrganisationContext handles the "no org" case by showing WorkspaceRecovery.
      setProfile(data);
      setProfileLoaded(true);
    } catch (error) {
      console.error('[AuthContext] Error loading profile:', error);
      // Set profile to a minimal object so OrganisationContext can still function
      setProfile(null);
      setProfileLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // After sign in, load the profile
    if (data.user) {
      await loadProfile(data.user.id);
    }
  }

  async function signUp(email: string, password: string, name: string, orgName: string) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Sign up failed');

    // Use RPC to create org (bypasses RLS on organisations table)
    try {
      const { data: orgId, error: orgError } = await supabase.rpc('create_organisation', {
        p_name: orgName
      });

      if (orgError) {
        console.error('[AuthContext] Error creating org via RPC:', orgError);
        // Don't throw - user can set up org later via WorkspaceRecovery
      }
    } catch (err) {
      console.error('[AuthContext] Exception creating org:', err);
      // Don't throw - user can set up org later
    }
  }

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[AuthContext] Refreshing profile...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        console.log('[AuthContext] Profile refreshed:', data.full_name, 'org_id:', data.org_id);
        setProfile(data);
      }
    } catch (error) {
      console.error('[AuthContext] Error refreshing profile:', error);
    }
  }, [user]);

  async function resetPasswordForEmail(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setProfileLoaded(false);
  }

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signOut, refreshProfile, resetPasswordForEmail, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
