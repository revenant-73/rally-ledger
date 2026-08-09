import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Team } from '../../types';

export const useTeams = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['teams', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await fetch('/.netlify/functions/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', userId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to load teams');
      }

      const body = await response.json() as { teams: Team[] };
      return body.teams;
    },
    enabled: !!userId,
  });
};

export const useAddTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, team }: { userId: string; team: Team }) => {
      const response = await fetch('/.netlify/functions/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', userId, team }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to save team');
      }

      return { ...team, ownerId: userId };
    },
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams', newTeam.ownerId] });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, teamId, updates }: { userId: string; teamId: string; updates: Partial<Team> }) => {
      const response = await fetch('/.netlify/functions/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', userId, teamId, updates }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'Failed to update team');
      }

      return { teamId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};
