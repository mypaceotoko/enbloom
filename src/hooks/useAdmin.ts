import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { isFounderEmail } from '../lib/admin';
import { requireSupabaseClient } from '../lib/supabase';

export function useAdmin() {
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const [databaseAdmin, setDatabaseAdmin] = useState(false);
  const email = user?.email ?? null;
  const isFounder = useMemo(() => isFounderEmail(email), [email]);

  useEffect(() => {
    let ignore = false;

    async function loadDatabaseAdmin() {
      if (!isSupabaseMode || !isAuthenticated || !user) {
        if (!ignore) setDatabaseAdmin(false);
        return;
      }

      try {
        const { data, error } = await requireSupabaseClient().rpc('is_admin', { user_id: user.id });
        if (!ignore) setDatabaseAdmin(!error && Boolean(data));
      } catch {
        if (!ignore) setDatabaseAdmin(false);
      }
    }

    void Promise.resolve().then(loadDatabaseAdmin);

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isSupabaseMode, user]);

  const isAdmin = isFounder || databaseAdmin;

  return {
    email,
    isFounder,
    isAdmin,
  };
}
