import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client, db } from '../../db/client';
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
export const addRallyMutationFn = async ({ rally, updatedSet }: AddRallyVariables) => {
  try {
    // serveResult/receiveResult/receivePlayerId live inside rally.metadata (JSON column),
    // not as physical columns, so only the schema's own columns are inserted here.
    const dbRally: typeof rallyEventsTable.$inferInsert = {
      id: rally.id,
      matchId: rally.matchId,
      setId: rally.setId,
      rallyNumber: rally.rallyNumber,
      scoreBeforeUs: rally.scoreBeforeUs,
      scoreBeforeOpponent: rally.scoreBeforeOpponent,
      scoreAfterUs: rally.scoreAfterUs,
      scoreAfterOpponent: rally.scoreAfterOpponent,
      pointWinner: rally.pointWinner,
      servingTeam: rally.servingTeam,
      serverPlayerId: rally.serverPlayerId ?? null,
      outcomeType: rally.outcomeType,
      classification: rally.classification,
      playerId: rally.playerId ?? null,
      notes: rally.notes ?? null,
      createdAt: rally.createdAt,
      metadata: rally.metadata ?? null,
    };

    await client.batch([
      {
        sql: `insert into rally_events (
          id,
          match_id,
          set_id,
          rally_number,
          score_before_us,
          score_before_opponent,
          score_after_us,
          score_after_opponent,
          point_winner,
          serving_team,
          server_player_id,
          outcome_type,
          classification,
          player_id,
          notes,
          created_at,
          metadata
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          dbRally.id,
          dbRally.matchId,
          dbRally.setId,
          dbRally.rallyNumber,
          dbRally.scoreBeforeUs,
          dbRally.scoreBeforeOpponent,
          dbRally.scoreAfterUs,
          dbRally.scoreAfterOpponent,
          dbRally.pointWinner,
          dbRally.servingTeam,
          dbRally.serverPlayerId ?? null,
          dbRally.outcomeType,
          dbRally.classification,
          dbRally.playerId ?? null,
          dbRally.notes ?? null,
          dbRally.createdAt,
          dbRally.metadata ? JSON.stringify(dbRally.metadata) : null,
        ],
      },
      {
        sql: `update sets
          set our_score = ?,
            opponent_score = ?,
            metadata = coalesce(?, metadata),
            updated_at = ?
          where id = ?`,
        args: [
          updatedSet.ourScore,
          updatedSet.opponentScore,
          updatedSet.metadata ? JSON.stringify(updatedSet.metadata) : null,
          new Date().toISOString(),
          updatedSet.id,
        ],
      },
    ], 'write');

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
  rallyId: string;
  matchId: string;
  setId: string;
  restoredScores: {
    ourScore: number;
    opponentScore: number;
  };
  restoredMetadata?: Set['metadata'];
};

export const undoLastRallyMutationFn = async ({ rallyId, setId, restoredScores, restoredMetadata, matchId }: UndoLastRallyVariables) => {
  await client.batch([
    {
      sql: 'delete from rally_events where id = ?',
      args: [rallyId],
    },
    {
      sql: `update sets
        set our_score = ?,
          opponent_score = ?,
          metadata = coalesce(?, metadata),
          updated_at = ?
        where id = ?`,
      args: [
        restoredScores.ourScore,
        restoredScores.opponentScore,
        restoredMetadata ? JSON.stringify(restoredMetadata) : null,
        new Date().toISOString(),
        setId,
      ],
    },
  ], 'write');
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
