import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Team, TeamAccessAssignment } from '../../types';
import { apiPost } from '../../utils/api';

export type AccessResponse = {
  isAdmin: boolean;
  teams: Team[];
  assignments: TeamAccessAssignment[];
  manageableTeamIds: string[];
};

export const accessQueryKey = (userId?: string) => ['access', userId];

export const useAccess = (userId?: string) => {
  const query = useQuery({
    queryKey: accessQueryKey(userId),
    queryFn: async () => {
      if (!userId) throw new Error('Authentication required');
      if (!navigator.onLine) throw new TypeError('Connection unavailable');
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        return await apiPost<AccessResponse>('/.netlify/functions/access', {
          action: 'list', userId,
        }, controller.signal);
      } finally { window.clearTimeout(timeout); }
    },
    enabled: Boolean(userId),
    retry: false,
    networkMode: 'always',
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
  });
  const { refetch } = query;
  useEffect(() => {
    if (!userId) return;
    // Query's online manager can start as "online" after a cold offline launch,
    // so explicitly refetch on the browser event as well. Concurrent observers
    // share the same request rather than cancelling each other's verification.
    const verify = () => { void refetch({ cancelRefetch: false }); };
    window.addEventListener('online', verify);
    return () => window.removeEventListener('online', verify);
  }, [userId, refetch]);
  return query;
};

export const useGrantAccess = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ coachEmail, teamId }: { coachEmail: string; teamId: string }) => {
      if (!userId) throw new Error('Authentication required');
      return apiPost<AccessResponse>('/.netlify/functions/access', {
        action: 'grant',
        userId,
        coachEmail,
        teamId,
        role: 'coach',
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(accessQueryKey(userId), data);
    },
  });
};

export const useRevokeAccess = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: TeamAccessAssignment) => {
      if (!userId) throw new Error('Authentication required');
      return apiPost<AccessResponse>('/.netlify/functions/access', {
        action: 'revoke',
        userId,
        accessId: assignment.id,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(accessQueryKey(userId), data);
    },
  });
};
