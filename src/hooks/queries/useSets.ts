import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { sets as setsTable } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import type { Set } from '../../types';

export const useActiveSet = (matchId: string | undefined) => {
  return useQuery({
    queryKey: ['sets', 'active', matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const activeSets = await db.select()
        .from(setsTable)
        .where(and(
          eq(setsTable.matchId, matchId),
          eq(setsTable.status, 'active')
        ))
        .limit(1);
      return (activeSets[0] as Set) || null;
    },
    enabled: !!matchId,
  });
};

export const useStartSet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSet: Set) => {
      await db.insert(setsTable).values(newSet);
      return newSet;
    },
    onSuccess: (newSet) => {
      queryClient.invalidateQueries({ queryKey: ['sets', 'active', newSet.matchId] });
    },
  });
};

export const useUpdateSet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ setId, updates }: { setId: string; updates: Partial<Set>; matchId?: string }) => {
      await db.update(setsTable)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(setsTable.id, setId));
      return { setId, updates };
    },
    onSuccess: (_data, variables) => {
      // Only ['sets', 'active', matchId] is ever queried, so invalidate that
      // specific entry when we know the matchId instead of the whole 'sets' space.
      if (variables.matchId) {
        queryClient.invalidateQueries({ queryKey: ['sets', 'active', variables.matchId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['sets'] });
      }
    },
  });
};
