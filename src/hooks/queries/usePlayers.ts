import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { players as playersTable } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
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
    mutationFn: async (newPlayer: Player) => {
      await db.insert(playersTable).values(newPlayer);
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
    mutationFn: async (playerId: string) => {
      await db.delete(playersTable).where(eq(playersTable.id, playerId));
      return playerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};
