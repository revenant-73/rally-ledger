import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { matches as matchesTable } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
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
    mutationFn: async (newMatch: Match) => {
      await db.insert(matchesTable).values(newMatch);
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
    mutationFn: async ({ matchId, updates }: { matchId: string; updates: Partial<Match> }) => {
      await db.update(matchesTable)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(matchesTable.id, matchId));
      return { matchId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};
