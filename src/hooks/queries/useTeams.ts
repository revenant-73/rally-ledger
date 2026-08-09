import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Team } from '../../types';
import { apiPost } from '../../utils/api';

export const useTeams = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['teams', userId],
    queryFn: async () => {
      if (!userId) return [];
      const body = await apiPost<{ teams: Team[] }>('/.netlify/functions/teams', { action: 'list', userId });
      return body.teams;
    },
    enabled: !!userId,
  });
};

export const useAddTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, team }: { userId: string; team: Team }) => {
      await apiPost('/.netlify/functions/teams', { action: 'add', userId, team });
      return { ...team, ownerId: userId };
    },
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams', newTeam.ownerId] });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, teamId, updates }: { userId: string; teamId: string; updates: Partial<Team> }) => {
      await apiPost('/.netlify/functions/teams', { action: 'update', userId, teamId, updates });
      return { teamId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string; teamId: string }) => {
      await apiPost('/.netlify/functions/teams', { action: 'delete', userId, teamId });
      return { userId, teamId };
    },
    onSuccess: ({ teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['access'] });
      queryClient.removeQueries({ queryKey: ['activeSet'] });
      queryClient.removeQueries({ queryKey: ['rallies'] });
      localStorage.removeItem('activeTeam');
      const savedMatch = localStorage.getItem('activeMatch');
      if (savedMatch) {
        try {
          const match = JSON.parse(savedMatch) as { teamId?: string };
          if (match.teamId === teamId) {
            localStorage.removeItem('activeMatch');
            localStorage.removeItem('activeSet');
          }
        } catch {
          localStorage.removeItem('activeMatch');
          localStorage.removeItem('activeSet');
        }
      }
    },
  });
};
