import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Match } from '../../types';

export const useMatches = (userId: string | undefined, teamIds: string[]) => {
  return useQuery({
    queryKey: ['matches', userId, teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const response = await fetch('/.netlify/functions/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId, teamIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to load matches');
      }

      const body = await response.json() as { matches: Match[] };
      return body.matches;
    },
    enabled: !!userId && teamIds.length > 0,
  });
};

export const useStartMatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, match: newMatch }: { userId: string; match: Match }) => {
      const response = await fetch('/.netlify/functions/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', userId, match: newMatch }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to create match');
      }

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
      const response = await fetch('/.netlify/functions/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', userId, matchId, updates }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to update match');
      }

      return { matchId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};
