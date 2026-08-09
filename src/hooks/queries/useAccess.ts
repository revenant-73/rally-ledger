import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  return useQuery({
    queryKey: accessQueryKey(userId),
    queryFn: async () => {
      if (!userId) throw new Error('Authentication required');
      return apiPost<AccessResponse>('/.netlify/functions/access', {
        action: 'list',
        userId,
      });
    },
    enabled: Boolean(userId),
    retry: false,
  });
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
