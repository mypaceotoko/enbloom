import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { isFounderEmail } from '../lib/admin';

export function useAdmin() {
  const { user } = useAuth();
  const email = user?.email ?? null;
  const isFounder = useMemo(() => isFounderEmail(email), [email]);

  return {
    email,
    isFounder,
    isAdmin: isFounder,
  };
}
