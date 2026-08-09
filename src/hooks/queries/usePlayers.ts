import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { players as playersTable } from '../../db/schema';
import { inArray } from 'drizzle-orm';
import type { Player } from '../../types';

export const usePlayers = (teamIds: string[]) => {
  return useQuery({
    queryKey: ['players', teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const dbPlayers = await db.select().from(playersTable).where(inArray(playersTable.teamId, teamIds));
      return dbPlayers as Player[];
    },
    enabled: teamIds.length > 0,
  });
};

export const useAddPlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, player: newPlayer }: { userId: string; player: Player }) => {
      const response = await fetch('/.netlify/functions/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', userId, player: newPlayer }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to save player');
      }

      return newPlayer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};

export const useDeletePlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, playerId }: { userId: string; playerId: string }) => {
      const response = await fetch('/.netlify/functions/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId, playerId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to delete player');
      }

      return playerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};
