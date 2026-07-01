import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { rallyEvents as rallyEventsTable, sets as setsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { RallyEvent } from '../../types';

export const useRallies = (matchId: string | undefined) => {
  return useQuery({
    queryKey: ['rallies', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const dbRallies = await db.select()
        .from(rallyEventsTable)
        .where(eq(rallyEventsTable.matchId, matchId));
      
      // Map metadata fields back to top-level for application use
      return dbRallies.map((r) => {
        const metadata = r.metadata as Record<string, unknown> | null;
        return {
          ...r,
          serveResult: metadata?.serveResult,
          receiveResult: metadata?.receiveResult,
          receivePlayerId: metadata?.receivePlayerId,
        } as RallyEvent;
      });
    },
    enabled: !!matchId,
  });
};

export const useAddRally = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rally, updatedSet }: { rally: RallyEvent; updatedSet: { id: string; ourScore: number; opponentScore: number } }) => {
      try {
        // Strip fields that aren't in the physical DB schema
        const cleanRally = Object.entries(rally).reduce((acc, [key, value]) => {
          if (['serveResult', 'receiveResult', 'receivePlayerId'].includes(key)) {
            return acc;
          }
          return {
            ...acc,
            [key]: value === undefined ? null : value
          };
        }, {} as Record<string, unknown>);

        console.log('useAddRally: Inserting rally', cleanRally);
        await db.insert(rallyEventsTable).values(cleanRally as any);
        
        console.log('useAddRally: Updating set', updatedSet);
        await db.update(setsTable)
          .set({ 
            ourScore: updatedSet.ourScore, 
            opponentScore: updatedSet.opponentScore,
            updatedAt: new Date().toISOString()
          })
          .where(eq(setsTable.id, updatedSet.id));
          
        return { rally, updatedSet };
      } catch (error) {
        console.error('useAddRally: Mutation failed!', error);
        throw error;
      }
    },
    onMutate: async ({ rally, updatedSet }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['rallies', rally.matchId] });
      await queryClient.cancelQueries({ queryKey: ['sets', 'active', rally.matchId] });

      // Snapshot the previous values
      const previousRallies = queryClient.getQueryData(['rallies', rally.matchId]);
      const previousSet = queryClient.getQueryData(['sets', 'active', rally.matchId]);

      // Optimistically update the rallies list
      queryClient.setQueryData(['rallies', rally.matchId], (old: RallyEvent[] | undefined) => {
        return [...(old || []), rally];
      });

      // Optimistically update the active set score
      queryClient.setQueryData(['sets', 'active', rally.matchId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          ourScore: updatedSet.ourScore,
          opponentScore: updatedSet.opponentScore,
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

export const useUndoLastRally = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rallyId, matchId, setId, restoredScores }: { rallyId: string; matchId: string; setId: string; restoredScores: { ourScore: number; opponentScore: number } }) => {
      await db.delete(rallyEventsTable).where(eq(rallyEventsTable.id, rallyId));
      await db.update(setsTable)
        .set({ ourScore: restoredScores.ourScore, opponentScore: restoredScores.opponentScore })
        .where(eq(setsTable.id, setId));
      return { matchId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rallies', data.matchId] });
      queryClient.invalidateQueries({ queryKey: ['sets', 'active', data.matchId] });
    },
  });
};
