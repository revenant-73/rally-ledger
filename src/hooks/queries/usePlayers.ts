import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Player } from '../../types';
import { apiPost } from '../../utils/api';

export const usePlayers = (userId: string | undefined, teamIds: string[]) => {
  return useQuery({
    queryKey: ['players', userId, teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const body = await apiPost<{ players: Player[] }>('/.netlify/functions/players', { action: 'list', userId, teamIds });
      return body.players;
    },
    enabled: !!userId && teamIds.length > 0,
  });
};

export const useAddPlayer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, player: newPlayer }: { userId: string; player: Player }) => {
      await apiPost('/.netlify/functions/players', { action: 'add', userId, player: newPlayer });
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
      await apiPost('/.netlify/functions/players', { action: 'delete', userId, playerId });
      return playerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });
};
