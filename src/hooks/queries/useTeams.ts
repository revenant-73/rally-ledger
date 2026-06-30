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
    mutationFn: async (newTeam: Team) => {
      await db.insert(teamsTable).values(newTeam);
      return newTeam;
    },
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: ['teams', newTeam.ownerId] });
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) => {
      await db.update(teamsTable)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(eq(teamsTable.id, teamId));
      
      // We need the ownerId to invalidate the correct query
      // For now we'll just invalidate all teams, or we could fetch the team first
      return { teamId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};
