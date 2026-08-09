import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { matches as matchesTable } from '../../db/schema';
import { inArray } from 'drizzle-orm';
import type { Match } from '../../types';

export const useMatches = (teamIds: string[]) => {
  return useQuery({
    queryKey: ['matches', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const dbMatches = await db.select().from(matchesTable).where(inArray(matchesTable.teamId, teamIds));
      return dbMatches as Match[];
    },
    enabled: teamIds.length > 0,
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
