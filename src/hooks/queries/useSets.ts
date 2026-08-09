import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Set } from '../../types';
import { apiPost } from '../../utils/api';

export const useActiveSet = (userId: string | undefined, matchId: string | undefined) => {
  return useQuery({
    queryKey: ['sets', 'active', userId, matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const body = await apiPost<{ set: Set | null }>('/.netlify/functions/sets', { action: 'active', userId, matchId });
      return body.set;
    },
    enabled: !!userId && !!matchId,
  });
};

export const useStartSet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, set: newSet }: { userId: string; set: Set }) => {
      await apiPost('/.netlify/functions/sets', { action: 'start', userId, set: newSet });
      return newSet;
    },
    onSuccess: (newSet, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sets', 'active', variables.userId, newSet.matchId] });
    },
  });
};

type UpdateSetVariables = { userId: string; setId: string; updates: Partial<Set>; matchId?: string };

export const updateSetMutationFn = async ({ userId, setId, updates, matchId }: UpdateSetVariables) => {
  if (!matchId) {
    throw new Error('Match ID is required to update a set');
  }

  await apiPost('/.netlify/functions/sets', { action: 'update', userId, setId, matchId, updates });

  return { setId, updates, matchId };
};

export const useUpdateSet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updateSet'],
    mutationFn: updateSetMutationFn,
    onSuccess: (_data, variables) => {
      // Only ['sets', 'active', userId, matchId] is ever queried, so invalidate that
      // specific entry when we know the matchId instead of the whole 'sets' space.
      if (variables.matchId) {
        queryClient.invalidateQueries({ queryKey: ['sets', 'active', variables.userId, variables.matchId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['sets'] });
      }
    },
  });
};
