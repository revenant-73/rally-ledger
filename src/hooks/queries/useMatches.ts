import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Match } from '../../types';
import { apiPost } from '../../utils/api';

export const useMatches = (userId: string | undefined, teamIds: string[]) => {
  return useQuery({
    queryKey: ['matches', userId, teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const body = await apiPost<{ matches: Match[] }>('/.netlify/functions/matches', { action: 'list', userId, teamIds });
      return body.matches;
    },
    enabled: !!userId && teamIds.length > 0,
  });
};

export const useStartMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['startMatch'],
    mutationFn: startMatchMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

type StartMatchVariables = { userId: string; match: Match };

export const startMatchMutationFn = async ({ userId, match: newMatch }: StartMatchVariables) => {
  await apiPost('/.netlify/functions/matches', { action: 'start', userId, match: newMatch });
  return newMatch;
};

type UpdateMatchVariables = { userId: string; matchId: string; updates: Partial<Match> };

export const updateMatchMutationFn = async ({ userId, matchId, updates }: UpdateMatchVariables) => {
  await apiPost('/.netlify/functions/matches', { action: 'update', userId, matchId, updates });
  return { matchId, updates };
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updateMatch'],
    mutationFn: updateMatchMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useDeleteMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, matchId }: { userId: string; matchId: string }) => {
      await apiPost('/.netlify/functions/matches', { action: 'delete', userId, matchId });
      return { userId, matchId };
    },
    onSuccess: ({ matchId }) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.removeQueries({ queryKey: ['rallies'] });
      queryClient.removeQueries({ queryKey: ['sets'] });
      const savedMatch = localStorage.getItem('activeMatch');
      if (savedMatch) {
        try {
          const match = JSON.parse(savedMatch) as { id?: string };
          if (match.id === matchId) {
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
