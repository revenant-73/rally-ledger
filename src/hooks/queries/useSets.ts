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
    mutationFn: async ({ userId, set: newSet }: { userId: string; set: Set }) => {
      const response = await fetch('/.netlify/functions/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', userId, set: newSet }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to start set');
      }

      return newSet;
    },
    onSuccess: (newSet) => {
      queryClient.invalidateQueries({ queryKey: ['sets', 'active', newSet.matchId] });
    },
  });
};

type UpdateSetVariables = { userId: string; setId: string; updates: Partial<Set>; matchId?: string };

export const updateSetMutationFn = async ({ userId, setId, updates, matchId }: UpdateSetVariables) => {
  if (!matchId) {
    throw new Error('Match ID is required to update a set');
  }

  const response = await fetch('/.netlify/functions/sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', userId, setId, matchId, updates }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || 'Failed to update set');
  }

  return { setId, updates, matchId };
};

export const useUpdateSet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updateSet'],
    mutationFn: updateSetMutationFn,
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
