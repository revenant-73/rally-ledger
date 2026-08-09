import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../db/client';
import { teams as teamsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { Team } from '../../types';

export const useTeams = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['teams', userId],
    queryFn: async () => {
      if (!userId) return [];
      const dbTeams = await db.select().from(teamsTable).where(eq(teamsTable.ownerId, userId));
      return dbTeams as Team[];
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
