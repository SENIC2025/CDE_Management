import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function usePlatformAdmin() {
  const { user } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkPlatformAdmin();
    } else {
      setIsPlatformAdmin(false);
      setLoading(false);
    }
  }, [user]);

  async function checkPlatformAdmin() {
    try {
      const { data, error } = await supabase.rpc('is_platform_admin');

      if (error) {
        console.error('Error checking platform admin:', error);
        setIsPlatformAdmin(false);
      } else {
        setIsPlatformAdmin(data || false);
      }
    } catch (error) {
      console.error('Error checking platform admin:', error);
      setIsPlatformAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  return { isPlatformAdmin, loading };
}
