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
    mutationFn: async ({ userId, match: newMatch }: { userId: string; match: Match }) => {
      await apiPost('/.netlify/functions/matches', { action: 'start', userId, match: newMatch });
      return newMatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useUpdateMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, matchId, updates }: { userId: string; matchId: string; updates: Partial<Match> }) => {
      await apiPost('/.netlify/functions/matches', { action: 'update', userId, matchId, updates });
      return { matchId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};
