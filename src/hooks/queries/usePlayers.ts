import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Player } from '../../types';

export const usePlayers = (userId: string | undefined, teamIds: string[]) => {
  return useQuery({
    queryKey: ['players', userId, teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const response = await fetch('/.netlify/functions/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId, teamIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to load players');
      }

      const body = await response.json() as { players: Player[] };
      return body.players;
    },
    enabled: !!userId && teamIds.length > 0,
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
