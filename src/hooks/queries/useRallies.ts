import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { rallyEvents as rallyEventsTable } from '../../db/schema';
import { asc, eq } from 'drizzle-orm';
import type { RallyEvent, Set } from '../../types';
import { normalizeRallies, sortRallies } from '../../utils/rallies';

export const useRallies = (matchId: string | undefined) => {
  return useQuery({
    queryKey: ['rallies', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const dbRallies = await db.select()
        .from(rallyEventsTable)
        .where(eq(rallyEventsTable.matchId, matchId))
        .orderBy(asc(rallyEventsTable.rallyNumber), asc(rallyEventsTable.createdAt));

      return normalizeRallies(dbRallies);
    },
    enabled: !!matchId,
  });
};

type AddRallyVariables = {
  userId: string;
  rally: RallyEvent;
  updatedSet: {
    id: string;
    ourScore: number;
    opponentScore: number;
    metadata?: Set['metadata'];
  };
};

// Registered as a mutation default (see main.tsx) so a paused/persisted mutation
// can be replayed after the app is closed and reopened, without needing the
// original component closure that created it.
export const addRallyMutationFn = async ({ userId, rally, updatedSet }: AddRallyVariables) => {
  try {
    const response = await fetch('/.netlify/functions/rallies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', userId, rally, updatedSet }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(body?.error || 'Failed to save rally');
    }

    return { rally, updatedSet };
  } catch (error) {
    console.error('addRallyMutationFn: Mutation failed!', error);
    throw error;
  }
};

export const useAddRally = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['addRally'],
    mutationFn: addRallyMutationFn,
    onMutate: async ({ rally, updatedSet }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rallies', rally.matchId] });
      await queryClient.cancelQueries({ queryKey: ['sets', 'active', rally.matchId] });

      // Snapshot the previous values
      const previousRallies = queryClient.getQueryData(['rallies', rally.matchId]);
      const previousSet = queryClient.getQueryData(['sets', 'active', rally.matchId]);

      // Optimistically update the rallies list
      queryClient.setQueryData(['rallies', rally.matchId], (old: RallyEvent[] | undefined) => {
        return sortRallies([...(old || []), rally]);
      });

      // Optimistically update the active set score
      queryClient.setQueryData(['sets', 'active', rally.matchId], (old: Set | null | undefined) => {
        if (!old) return old;
        return {
          ...old,
          ourScore: updatedSet.ourScore,
          opponentScore: updatedSet.opponentScore,
          metadata: updatedSet.metadata ?? old.metadata,
          updatedAt: new Date().toISOString()
        };
      });

      // Return a context object with the snapshotted value
      return { previousRallies, previousSet };
    },
    onError: (_err, { rally }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context) {
        queryClient.setQueryData(['rallies', rally.matchId], context.previousRallies);
        queryClient.setQueryData(['sets', 'active', rally.matchId], context.previousSet);
      }
    },
    onSettled: (data) => {
      // Always refetch after error or success to ensure we are in sync with the server
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['rallies', data.rally.matchId] });
        queryClient.invalidateQueries({ queryKey: ['sets', 'active', data.rally.matchId] });
      }
    },
  });
};

type UndoLastRallyVariables = {
  userId: string;
  rallyId: string;
  matchId: string;
  setId: string;
  restoredScores: {
    ourScore: number;
    opponentScore: number;
  };
  restoredMetadata?: Set['metadata'];
};

export const undoLastRallyMutationFn = async ({ userId, rallyId, setId, restoredScores, restoredMetadata, matchId }: UndoLastRallyVariables) => {
  const response = await fetch('/.netlify/functions/rallies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'undo',
      userId,
      rallyId,
      matchId,
      setId,
      restoredScores,
      restoredMetadata,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error || 'Failed to undo rally');
  }

  return { matchId };
};

export const useUndoLastRally = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['undoLastRally'],
    mutationFn: undoLastRallyMutationFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rallies', data.matchId] });
      queryClient.invalidateQueries({ queryKey: ['sets', 'active', data.matchId] });
    },
  });
};
