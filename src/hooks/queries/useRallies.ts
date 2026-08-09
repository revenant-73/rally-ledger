import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { RallyEvent, Set } from '../../types';
import { normalizeRallies, sortRallies } from '../../utils/rallies';

export const useRallies = (userId: string | undefined, matchId: string | undefined) => {
  return useQuery({
    queryKey: ['rallies', userId, matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const response = await fetch('/.netlify/functions/rallies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId, matchId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to load rallies');
      }

      const body = await response.json() as { rallies: RallyEvent[] };
      return normalizeRallies(body.rallies);
    },
    enabled: !!userId && !!matchId,
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
    onMutate: async ({ userId, rally, updatedSet }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rallies', userId, rally.matchId] });
      await queryClient.cancelQueries({ queryKey: ['sets', 'active', userId, rally.matchId] });

      // Snapshot the previous values
      const previousRallies = queryClient.getQueryData(['rallies', userId, rally.matchId]);
      const previousSet = queryClient.getQueryData(['sets', 'active', userId, rally.matchId]);

      // Optimistically update the rallies list
      queryClient.setQueryData(['rallies', userId, rally.matchId], (old: RallyEvent[] | undefined) => {
        return sortRallies([...(old || []), rally]);
      });

      // Optimistically update the active set score
      queryClient.setQueryData(['sets', 'active', userId, rally.matchId], (old: Set | null | undefined) => {
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
    onError: (_err, { userId, rally }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context) {
        queryClient.setQueryData(['rallies', userId, rally.matchId], context.previousRallies);
        queryClient.setQueryData(['sets', 'active', userId, rally.matchId], context.previousSet);
      }
    },
    onSettled: (data, _error, variables) => {
      // Always refetch after error or success to ensure we are in sync with the server
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['rallies', variables.userId, data.rally.matchId] });
        queryClient.invalidateQueries({ queryKey: ['sets', 'active', variables.userId, data.rally.matchId] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rallies', variables.userId, data.matchId] });
      queryClient.invalidateQueries({ queryKey: ['sets', 'active', variables.userId, data.matchId] });
    },
  });
};
